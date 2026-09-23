FROM python:3.12-slim
WORKDIR /app
# Everything needed for conversion is installed from Python packages.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home converter
COPY --chown=converter:converter app.py portable_converters.py ./
COPY --chown=converter:converter templates/ ./templates/
COPY --chown=converter:converter static/ ./static/
RUN chown converter:converter /app && mkdir -p uploads converted \
    && chown -R converter:converter uploads converted
USER converter
ENV PYTHONUNBUFFERED=1
# Fail the build if the website or its assets cannot be served.
RUN python -c "from app import app; client = app.test_client(); paths = ('/', '/static/css/style.css', '/static/js/script.js'); codes = {path: client.get(path).status_code for path in paths}; print(codes); assert all(code == 200 for code in codes.values()), codes"
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--timeout", "180", "app:app"]
