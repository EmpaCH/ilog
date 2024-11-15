## Prerequisites
- Node.js 18+ or 20+
- npm
- vite
- docker
- [task](https://taskfile.dev/installation/#npm)

> **_NOTE:_** The `Vite` and `Docker` commands do not need to be executed. They are only an explanation of what `Task` does in the background.

## Vite
Vite is a build tool that provides a faster and leaner development experience for modern web projects.
Developing a React app with Vite is straightforward and one would only need two commands to do so:
```
npm install
npm run dev
```

## Docker
To start developing with the OpenBIS JavaScript API we need to create a container for a Postgres db and a container to create our local OpenBIS instance.
This is done in the [docker-compose](docker-compose.yml) file and the command to start up these containers would be:
```
docker compose up -d
```

## Task
Task is a build tool that simplifies development.
Once installed, you just need to describe your build tasks using a simple YAML schema in a file called [Taskfile](Taskfile.yaml).

There you can see that everything we need in order to start up our app is bundled under the `dev` task.
Which means that from now on we only need to run a single command, that takes care of everything:
```
task dev
```

## Backend (OpenBIS JavaScript API)
[TODO]

## Frontend (React)
[TODO]
