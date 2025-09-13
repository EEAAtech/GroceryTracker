# Use an official Python runtime as a parent image
FROM python:3.9-slim

# --- Install System Dependencies for Microsoft ODBC Driver ---
# This block installs the necessary OS-level packages that pyodbc depends on.
# --- Install System Dependencies for Microsoft ODBC Driver ---
    RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    unixodbc \
    unixodbc-dev \
    # Create directory for trusted keys if not exists
    && mkdir -p /etc/apt/trusted.gpg.d /etc/apt/sources.list.d \
    # Add Microsoft's GPG key (modern method)
    && curl -sSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /etc/apt/trusted.gpg.d/microsoft.gpg \
    # Add Microsoft SQL Server APT repository
    && curl -sSL https://packages.microsoft.com/config/debian/11/prod.list \
        > /etc/apt/sources.list.d/mssql-release.list \
    # Install msodbcsql18 driver
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- Register the ODBC Driver ---
RUN echo "[ODBC Driver 18 for SQL Server]" > /etc/odbcinst.ini && \
    echo "Description=Microsoft ODBC Driver 18 for SQL Server" >> /etc/odbcinst.ini && \
    echo "Driver=/usr/lib64/libmsodbcsql-18.so" >> /etc/odbcinst.ini && \
    echo "UsageCount=1" >> /etc/odbcinst.ini

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application source
COPY . .

# Your app binds to port 8000 as configured in app.py
EXPOSE 8000

# Define the command to run your app
CMD ["python", "app.py"]