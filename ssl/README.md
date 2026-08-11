# SSL Certificates

Place your TLS certificates here:

- `fullchain.pem` — Full certificate chain (server cert + intermediate CA certs)
- `privkey.pem` — Private key

These files are required by the production nginx reverse proxy
(`docker-compose.prod.yml`). The files are mounted read-only into
the nginx container at `/etc/nginx/ssl/`.

**Never commit actual certificate or key files to the repository.**
