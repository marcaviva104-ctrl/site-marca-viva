from pathlib import Path

p = Path(__file__).resolve().parent.parent / "admin" / "js" / "admin.js"
lines = p.read_text(encoding="utf-8", errors="replace").splitlines(True)
out = []
for line in lines:
    if "devendo" in line and "walletContainer.innerHTML" in line:
        out.append(
            "                    walletContainer.innerHTML = '<div style=\"text-align:center; color:#94a3b8; padding:10px;\">Nenhum saldo em aberto no periodo.</div>';\n"
        )
    else:
        out.append(line)
p.write_text("".join(out), encoding="utf-8")
print("ok")
