# Wrapped — common ops, all in one place.
#
# Quick start:
#   make up          build image, run container, follow logs
#   make logs        tail container logs
#   make down        stop + remove container
#   make restart     down + up
#   make shell       open a shell inside the running container
#   make check       npm run check (typecheck + lint + tests) locally
#   make dev         run server locally (no Docker), hot-reload
#   make web-dev     run Vite dev server (UI hot-reload, proxies API to :3000)

# --- config ---
IMAGE         := wrpd
CONTAINER     := wrpd
PORT          := 3000
ENV_FILE      := .env
DATA_VOLUME   := $(PWD)/data:/app/data
OUT_VOLUME    := $(PWD)/out:/app/out
SHM_SIZE      := 1g

# Runtime flags that matter:
#   --init        reap zombie chromium processes (otherwise they pile up)
#   --shm-size    Chromium needs >>64MB shared memory or it crashes
#   --env-file    workspace tokens (Slack, GitHub, etc.) — never bake into image
#   -v data       persist members.json, archive.json, schedule.json across restarts
#   -v out        keep the render cache (out/cache/*.mp4) on the host
RUN_FLAGS     := --init \
                 --shm-size=$(SHM_SIZE) \
                 -p $(PORT):3000 \
                 --env-file $(ENV_FILE) \
                 -v "$(DATA_VOLUME)" \
                 -v "$(OUT_VOLUME)"

# Railway (Girijesh-agrim workspace) — link only until you run railway-deploy
RAILWAY_WORKSPACE ?= Girijesh-agrim
RAILWAY_PROJECT    ?= wrpd
RAILWAY_SERVICE    ?=

.PHONY: help build up down restart logs shell ps clean clean-cache check dev web-dev web-build install \
	railway-install railway-login railway-whoami railway-init railway-link railway-status \
	railway-volume railway-vars railway-deploy

help:
	@echo "Wrapped Makefile targets:"
	@echo ""
	@echo "  Docker:"
	@echo "    make build         build the docker image"
	@echo "    make up            build + run container (detached)"
	@echo "    make down          stop + remove container"
	@echo "    make restart       down + up"
	@echo "    make logs          tail container logs (follow)"
	@echo "    make shell         interactive shell inside container"
	@echo "    make ps            show wrpd container status"
	@echo ""
	@echo "  Local dev (no Docker):"
	@echo "    make install       install all deps (root + web)"
	@echo "    make dev           start server with hot-reload on :3000"
	@echo "    make web-dev       start Vite dev server on :5173 (proxies API)"
	@echo "    make web-build     build the frontend to web/dist"
	@echo "    make check         typecheck + lint + tests"
	@echo ""
	@echo "  Railway ($(RAILWAY_WORKSPACE)):"
	@echo "    make railway-install   install Railway CLI (brew)"
	@echo "    make railway-login     browser login"
	@echo "    make railway-init      create+link project (no deploy)"
	@echo "    make railway-link      link to existing project"
	@echo "    make railway-status    show linked project"
	@echo "    make railway-volume    mount /app/data + /app/out volumes"
	@echo "    make railway-deploy    deploy via railway up (when ready)"
	@echo ""
	@echo "  Housekeeping:"
	@echo "    make clean-cache   wipe out/cache/*.mp4 (force re-render)"
	@echo "    make clean         clean-cache + remove image + container"

# --- docker ---

build:
	docker build -t $(IMAGE) .

up: build
	-docker rm -f $(CONTAINER) 2>/dev/null
	docker run -d --name $(CONTAINER) $(RUN_FLAGS) $(IMAGE)
	@echo "Waiting for server to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
	  if curl -fs http://localhost:$(PORT)/api/health >/dev/null 2>&1; then \
	    echo "✓ http://localhost:$(PORT) is live"; \
	    exit 0; \
	  fi; \
	  sleep 1; \
	done; \
	echo "✗ server didn't come up — check 'make logs'"; exit 1

down:
	-docker rm -f $(CONTAINER)

restart: down up

logs:
	docker logs -f $(CONTAINER)

shell:
	docker exec -it $(CONTAINER) bash

ps:
	@docker ps -a --filter name=$(CONTAINER) --format \
	  "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# --- local dev (no docker) ---

install:
	npm install --legacy-peer-deps
	npm --prefix web install --legacy-peer-deps

dev:
	npm run server

web-dev:
	npm --prefix web run dev

web-build:
	npm --prefix web run build

check:
	npm run check

# --- housekeeping ---

clean-cache:
	rm -rf out/cache
	@echo "cleared out/cache"

clean: down clean-cache
	-docker rmi $(IMAGE)
	@echo "cleaned"

# --- railway ---

railway-install:
	@command -v railway >/dev/null || brew install railway
	@railway --version

railway-login:
	railway login

railway-whoami:
	railway whoami

railway-init: railway-install
	@echo "Creating project '$(RAILWAY_PROJECT)' in workspace '$(RAILWAY_WORKSPACE)' (no deploy)…"
	railway init --name "$(RAILWAY_PROJECT)" --workspace "$(RAILWAY_WORKSPACE)"

railway-link: railway-install
	railway link --workspace "$(RAILWAY_WORKSPACE)"

railway-status:
	railway status

railway-volume:
	@# Wrapped needs TWO mounts: /app/data (registry + archive metadata)
	@# and /app/out (the rendered MP4s themselves). Losing either is bad.
	@if [ -n "$(RAILWAY_SERVICE)" ]; then \
	  railway volume add --mount-path /app/data --service "$(RAILWAY_SERVICE)"; \
	  railway volume add --mount-path /app/out  --service "$(RAILWAY_SERVICE)"; \
	else \
	  railway volume add --mount-path /app/data; \
	  railway volume add --mount-path /app/out; \
	fi
	@echo "Volume mounts: /app/data (members, archive, schedule) + /app/out (rendered videos)"

railway-vars:
	@echo "Set variables in Railway dashboard or: railway variables set KEY=value"
	@echo "See docs/railway.md and .env.example"

railway-deploy:
	@echo "Deploying to Railway (railway up)…"
	railway up
