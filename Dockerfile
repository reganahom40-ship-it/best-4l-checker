FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy application files
COPY . /app

# Expose port
EXPOSE 3000

# Set environment variable for Port
ENV PORT=3000

# Start server
CMD ["python", "server.py"]
