# Autoriza esta maquina a falar com o Google Ads e o Tag Manager.
#   python scripts/google/autorizar.py
# Roda UMA vez. Entrada: .secrets/oauth-client.json  ·  Saida: .secrets/token.json

import json, pathlib, sys
from google_auth_oauthlib.flow import InstalledAppFlow

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
COFRE = RAIZ / ".secrets"
CLIENTE = COFRE / "oauth-client.json"
TOKEN = COFRE / "token.json"

# Um consentimento so cobre as duas APIs. Peca os escopos de escrita do GTM
# desde ja: pedir depois obriga a repetir todo o fluxo. Pedir o escopo NAO
# significa usar.
ESCOPOS = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/tagmanager.readonly",
    "https://www.googleapis.com/auth/tagmanager.edit.containers",
    "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
    "https://www.googleapis.com/auth/tagmanager.publish",
]

if not CLIENTE.exists():
    sys.exit(f"! nao achei {CLIENTE}. Baixe o JSON do cliente OAuth 'Computador'.")

dados = json.loads(CLIENTE.read_text(encoding="utf-8"))
if "installed" not in dados:
    sys.exit("! esse JSON nao e de aplicativo para computador.")

flow = InstalledAppFlow.from_client_secrets_file(str(CLIENTE), scopes=ESCOPOS)

# access_type=offline e o que faz o Google devolver refresh_token; sem ele a
# credencial morre em 1 hora. prompt=consent forca a devolucao mesmo se a conta
# ja tiver autorizado este cliente antes — sem isso, reautorizar devolve vazio.
cred = flow.run_local_server(port=0, access_type="offline", prompt="consent")

TOKEN.write_text(json.dumps({
    "refresh_token": cred.refresh_token,
    "client_id": cred.client_id,
    "client_secret": cred.client_secret,
    "token_uri": cred.token_uri,
    "scopes": cred.scopes,
}, indent=2), encoding="utf-8")
print(f"ok — token gravado em {TOKEN}")
