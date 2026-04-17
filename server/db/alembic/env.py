import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Import Base from models so Alembic can introspect the metadata
from server.db.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate support
target_metadata = Base.metadata


def get_database_url() -> str:
    """
    Resolve the database URL at runtime.

    Priority:
    1. DATABASE_URL environment variable
    2. server.config.settings.database_url
    3. sqlalchemy.url from alembic.ini (fallback placeholder)
    """
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    try:
        from server.config import settings
        return settings.database_url
    except Exception:
        pass

    url = config.get_main_option("sqlalchemy.url")
    if url:
        return url

    raise RuntimeError(
        "No database URL found. Set DATABASE_URL environment variable or "
        "ensure server.config.settings.database_url is configured."
    )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine;
    no actual connection is established, but all SQL is emitted to stdout.
    """
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode using an async engine."""
    url = get_database_url()

    connectable = create_async_engine(url, echo=False)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
