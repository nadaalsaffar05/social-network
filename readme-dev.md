#### to run docker img

```bash
docker compose up -d 
```

one thing to note from the  docker is that it will 'compile' the FE/BE in parallel. you can notice this with the compose command -- this is heavely inspired by how its done at work

https://www.freecodecamp.org/news/how-to-dockerize-a-react-application/
https://www.docker.com/blog/how-to-dockerize-react-app/
https://dev.to/arcadebuilds/docker-setup-for-go-apis-2lbk

### Using Docker Compose
Start all services (foreground mode):
`docker compose up`
Start all services in detached mode (background):
`docker compose up -d`
Start only the dev service:
`docker compose up dev --watch`
Start only the prod service:
`docker compose up prod`
Stop services:
`docker compose down`

------------------------------------------------