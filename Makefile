.PHONY: setup infra server worker client run stop

setup:
	cd client && npm install

infra:
	docker compose up -d

server:
	uvicorn server.main:app --reload --port 3001

worker:
	celery -A server.queue.celery_app worker --loglevel=info

client:
	cd client && npm run dev

run: infra
	# Start server, worker, and client in the background
	uvicorn server.main:app --reload --port 3001 & \
	celery -A server.queue.celery_app worker --loglevel=info & \
	(cd client && npm run dev) & \
	echo "All services starting... Press Ctrl+C to stop (may require manual cleanup of background processes)"

stop:
	docker compose down
	pkill -f "uvicorn server.main:app" || true
	pkill -f "celery -A server.queue.celery_app" || true
	pkill -f "vite" || true
