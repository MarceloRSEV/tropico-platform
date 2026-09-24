#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Ads OAuth - Renovar Credenciais
Regenera refresh token com acesso ao customer
"""

import os
import sys
from google_auth_oauthlib.flow import InstalledAppFlow
import dotenv

# Suportar Unicode no Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Carregar .env.local
dotenv.load_dotenv('.env.local')

CLIENT_ID = os.getenv('GOOGLE_ADS_CLIENT_ID')
CLIENT_SECRET = os.getenv('GOOGLE_ADS_CLIENT_SECRET')
CUSTOMER_ID = os.getenv('GOOGLE_ADS_CUSTOMER_ID')

SCOPES = ['https://www.googleapis.com/auth/adwords']

def get_credentials():
    """Obter credentials via OAuth 2.0"""

    # Criar configuração do cliente
    client_config = {
        "installed": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost:8080/"]
        }
    }

    # Iniciar flow OAuth
    flow = InstalledAppFlow.from_client_config(client_config, scopes=SCOPES)

    print('🌐 Abrindo navegador para autorização...')
    creds = flow.run_local_server(port=8080, open_browser=True)

    return creds

def main():
    print('🔐 Google Ads OAuth - Regenerar Credenciais')
    print(f'📍 Customer: {CUSTOMER_ID}')
    print('')

    try:
        # Obter credenciais
        creds = get_credentials()

        # Extrair refresh token
        refresh_token = creds.refresh_token

        print('✅ Autenticação bem-sucedida!')
        print('')
        print('📋 Novo Refresh Token:')
        print(f'{refresh_token}')
        print('')
        print('🔄 Copie e cole em .env.local:')
        print(f'GOOGLE_ADS_REFRESH_TOKEN={refresh_token}')
        print('')
        print('✅ Pronto! Execute novamente: node scripts/sync-google-ads.js')

    except Exception as e:
        print(f'❌ Erro: {e}')
        print('')
        print('💡 Dicas:')
        print('   1. Certifique-se que CLIENT_ID e CLIENT_SECRET estão em .env.local')
        print('   2. Verifique se o projeto Google Cloud está ativo')
        print('   3. Confirme que a OAuth 2.0 está habilitada no Google Cloud Console')

if __name__ == '__main__':
    main()
