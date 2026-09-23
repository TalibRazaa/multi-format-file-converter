FROM python:3.12-slim
WORKDIR /app
# Everything needed for conversion is installed from Python packages.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home converter
COPY --chown=converter:converter . .
RUN chown converter:converter /app && mkdir -p uploads converted \
    && chown -R converter:converter uploads converted
USER converter
ENV PYTHONUNBUFFERED=1
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--timeout", "180", "app:app"]
