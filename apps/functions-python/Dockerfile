# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.12-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED=True

# Set the working directory in the container
WORKDIR /app

# Install production dependencies.
# Copy only requirements to leverage Docker cache
COPY pyproject.toml ./
# Install dependencies using uv (faster than pip)
# Install uv first
RUN pip install uv
# Install dependencies using uv, including those listed in pyproject.toml
RUN uv pip install --system . # Remove --no-deps to install dependencies from pyproject.toml

# Copy local code to the container image.
COPY src/ ./src/

# Run the web server on container startup.
# Use Uvicorn to run the FastAPI app.
# The server is listening on port 8080, which is the default port for Cloud Run.
# Use 0.0.0.0 to make it accessible from outside the container.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]