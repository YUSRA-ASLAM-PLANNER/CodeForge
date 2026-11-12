import ast
import json
import sys


def dotted_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        prefix = dotted_name(node.value)
        return (prefix + "." if prefix else "") + node.attr
    return None


def analyze_file(path, source):
    try:
        tree = ast.parse(source, filename=path)
    except (SyntaxError, ValueError) as error:
        return {"symbols": [], "calls": [], "bindings": [], "warning": f"Python AST parse failed for {path}: {error}"}

    symbols = {}
    calls = {}
    bindings = []
    owners = []

    def add_symbol(name, kind, node):
        if name:
            symbols[kind + ":" + name] = {"name": name, "kind": kind, "line": getattr(node, "lineno", 1)}

    def visit(node, class_name=None, parent_scope=None):
        if isinstance(node, ast.ClassDef):
            add_symbol(node.name, "class", node)
            for child in node.body:
                visit(child, node.name, node.name)
            return
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            name = node.name
            qualified = (parent_scope + "." + name) if parent_scope else name
            kind = "method" if class_name else "function"
            add_symbol(qualified, kind, node)
            owners.append((qualified, node))
            for child in node.body:
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    visit(child, class_name, qualified)
            return
        for child in ast.iter_child_nodes(node):
            visit(child, class_name, parent_scope)

    for node in tree.body:
        visit(node)

    for owner_name, owner in owners:
        def visit_calls(node):
            if node is not owner and isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
                return
            if isinstance(node, ast.Call):
                callee = None
                qualifier = None
                if isinstance(node.func, ast.Name):
                    callee = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    callee = node.func.attr
                    if isinstance(node.func.value, ast.Name):
                        qualifier = node.func.value.id
                    elif isinstance(node.func.value, ast.Call) and isinstance(node.func.value.func, ast.Name) and node.func.value.func.id == "super":
                        qualifier = "super"
                if callee:
                    line = getattr(node, "lineno", 1)
                    calls[(owner_name, qualifier or "", callee, line)] = {
                        "caller": owner_name,
                        "callee": callee,
                        "calleeQualifier": qualifier,
                        "line": line,
                    }
            for child in ast.iter_child_nodes(node):
                visit_calls(child)

        for child in owner.body:
            visit_calls(child)

    for node in tree.body:
        if isinstance(node, ast.Import):
            for alias in node.names:
                bindings.append({
                    "localName": alias.asname or alias.name.split(".")[0],
                    "importedName": alias.name,
                    "moduleSpecifier": alias.name,
                    "namespace": True,
                })
        elif isinstance(node, ast.ImportFrom):
            module = ("." * node.level) + (node.module or "")
            for alias in node.names:
                if alias.name == "*":
                    continue
                bindings.append({
                    "localName": alias.asname or alias.name,
                    "importedName": alias.name,
                    "moduleSpecifier": module,
                    "namespace": False,
                })

    symbols_out = sorted(symbols.values(), key=lambda item: (item["name"], item["kind"]))
    calls_out = sorted(calls.values(), key=lambda item: (item["caller"], item["callee"], item["line"]))
    bindings.sort(key=lambda item: (item["moduleSpecifier"], item["localName"], item["importedName"]))
    return {"symbols": symbols_out, "calls": calls_out, "bindings": bindings}


payload = json.load(sys.stdin)
result = {path: analyze_file(path, source) for path, source in payload.items()}
json.dump(result, sys.stdout, sort_keys=True)
