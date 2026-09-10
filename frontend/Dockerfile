# start from the official Node 20 image
FROM node:20-slim

# set the working directory inside the container
WORKDIR /app

# copy package files first — Docker caches this layer so it only reinstalls when packages change
COPY package*.json .

# install all Node packages
RUN npm install

# copy the rest of the frontend code
COPY . .

# expose port 5173 so other containers can reach React
EXPOSE 5173

# command to run when container starts — host 0.0.0.0 makes it accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]