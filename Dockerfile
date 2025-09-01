# Use an official Python runtime as a parent image
# Using slim for a good balance of size and features
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Bundle app source
COPY . .

# Create the database directory so the container can write to it
RUN mkdir -p /app/database

# Your app binds to port 3000, so expose it
EXPOSE 3000

# Define the command to run your app
CMD ["python", "app.py"]