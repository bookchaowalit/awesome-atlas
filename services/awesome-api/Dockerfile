FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 AWESOME_API_RUNTIME_DIR=/data
WORKDIR /app
COPY services/awesome-api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --user-group --create-home app
COPY services/awesome-api/awesome_api ./awesome_api
COPY services/awesome-api/docker-entrypoint.py ./docker-entrypoint.py
RUN mkdir -p /data /app/.runtime && chown app:app /data /app/.runtime
EXPOSE 3510
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["python", "-c", "import os, urllib.request; port=os.environ.get('PORT') or '3510'; urllib.request.urlopen('http://127.0.0.1:'+port+'/health', timeout=3)"]
ENTRYPOINT ["python", "/app/docker-entrypoint.py"]
