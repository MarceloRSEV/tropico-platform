# Cliente comum para as APIs do Google (Ads e Tag Manager).
# Le .secrets/token.json e troca o refresh token por um access token a cada
# execucao. O access token vale 1 hora e NAO e gravado em disco.

import json, pathlib
import requests

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
COFRE = RAIZ / ".secrets"
TOKEN = COFRE / "token.json"
DEV_TOKEN = COFRE / "ads-developer-token.txt"   # opcional, ver secao 1

# >>> IDs DO TROPICO (sem hifens) <<<
MCC = "9517281578"          # MCC PAI DIRETA da conta operada (951-728-1578)
CONTA = "9923174960"        # conta Tropico


def access_token():
    if not TOKEN.exists():
        raise SystemExit("! rode antes: python scripts/google/autorizar.py")
    c = json.loads(TOKEN.read_text(encoding="utf-8"))
    r = requests.post(c["token_uri"], data={
        "grant_type": "refresh_token",
        "refresh_token": c["refresh_token"],
        "client_id": c["client_id"],
        "client_secret": c["client_secret"],
    }, timeout=30)
    if r.status_code != 200:
        # invalid_grant quase sempre = tela de permissao em modo de teste e o
        # token passou dos 7 dias. Solucao: publicar o app, ou reautorizar.
        raise SystemExit(f"! falha ao renovar o token ({r.status_code}): {r.text[:300]}")
    return r.json()["access_token"]


def developer_token():
    if DEV_TOKEN.exists():
        return DEV_TOKEN.read_text(encoding="utf-8").strip()
    return None


def cabecalhos_ads(token=None, conta_login=MCC):
    h = {"Authorization": f"Bearer {token or access_token()}"}
    dev = developer_token()
    if dev:
        h["developer-token"] = dev
    if conta_login:
        h["login-customer-id"] = conta_login
    return h


def cabecalhos_gtm(token=None):
    return {"Authorization": f"Bearer {token or access_token()}"}
