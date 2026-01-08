NAME          = ft_transcendance
COMPOSE       = docker compose
COMPOSE_FILE  = docker-compose.yml

WEBAPP_DIR    = webapp
AUTH_DIR      = server/services/auth

SCRIPT        = ./setup.sh

# =================== RÈGLES ===================

all: up

up:
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

build:
	$(COMPOSE) -f $(COMPOSE_FILE) build

down:
	$(COMPOSE) -f $(COMPOSE_FILE) down

restart: down up

logs:
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

ps:
	$(COMPOSE) -f $(COMPOSE_FILE) ps

fclean:
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --remove-orphans


re: fclean
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build --force-recreate


# =================== SCRIPTS & NPM ===================

script:
	@if [ -x "$(SCRIPT)" ]; then \
		echo "▶ Exécution du script: $(SCRIPT)"; \
		"$(SCRIPT)"; \
	else \
		echo "ℹ Aucun script exécutable trouvé à $(SCRIPT) (skip)"; \
	fi

npm-clean:
	@echo "Suppression node_modules …"
	@sudo rm -rf "$(WEBAPP_DIR)/node_modules" || true
	@sudo rm -rf "$(AUTH_DIR)/node_modules" || true
	@echo "OK."


.PHONY: all up down restart logs ps clean fclean re script npm-clean npm-install npm-install-docker
