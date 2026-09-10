# start from the official Python 3.12 image — gives us Python pre-installed
FROM python:3.12-slim

# set the working directory inside the container
WORKDIR /app

# copy requirements first — Docker caches this layer so it only reinstalls when requirements change
COPY requirements.txt .

# install all Python packages
RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the backend code
COPY . .

# expose port 8000 so other containers can reach FastAPI
EXPOSE 8000

# command to run when container starts
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]