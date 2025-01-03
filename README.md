# Roomsy

## Table of Contents
- [Overview](#overview)
- [Features](#features)
  - [Admin Module](#admin-module)
  - [Client Module](#client-module)
- [Tech Stack](#tech-stack)
- [Installation and Setup](#installation-and-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Usage](#usage)

## Overview
The main aim is to bring and develop a community of like-minded people who have the same passion in a particular area and they would really want to share the experience with other people of the passion within a cool environment generated by a willing owner.
Roomsy is platform that will bring people together to meet, create, and celebrate. An online marketplace will make it easier than ever to find and book unique spaces for any activity it will enable people to meet, create (collaborate with colleagues) and celebrate (a major milestone). Space owners around the country can lease their property and make it available for rent by the hour/day for people seeking a location for their next meeting, event or activity. 

## Features

### Admin Module
* Add spaces
* View all added spaces (more information about the added space for edits)
* Add Users based on roles and permissions
* View the added users 

### Client Module
* View available spaces
* View more details about a space
* Login to platform
  * Social Auth
  * Local Auth
* Book space
  * Duration specified
  * Amount will be calculated depending on the duration
  * Status of the booked space changes (Meaning it can't be booked till status changes to available)
* Agreement incubator 
* Stripe payment implementation

## Tech Stack
* Backend: **Flask Python**
* Database: **SQLAlchemy**
* Wireframes: **Figma** 
* Testing Framework: **Pytest** (Backend) & **Vitest/React Testing Library** (Frontend)
* Frontend: **ReactJs & Redux Toolkit** (state management)

## Installation and Setup

### Backend Setup
1. Clone the repository
   ```
   git clone https://github.com/0097eo/roomsy.git
   cd roomsy
   ```
2. Create and activate virtual environment
   ```
   Pipenv shell
   ```
3. Installation of dependencies
   ```
   pipenv install
   ```
4. Setup environment variables
   Make sure to create a .env file in the root directory with teh following environment variables
   ```
   CLOUDINARY_CLOUD_NAME = ''
   CLOUDINARY_API_KEY = ''
   CLOUDINARY_API_SECRET = ''
   EMAIL_USER = ''
   EMAIL_PASSWORD = ''
   AUTH0_CLIENT_ID=''
   AUTH0_CLIENT_SECRET=''
   AUTH0_DOMAIN=''
   AUTH0_AUDIENCE=''
   STRIPE_SECRET_KEY=''
   STRIPE_WEBHOOK_SECRET=''
   ```

   
4. Initialize the database
   ```
   flask db init
   flask db migrate
   flask db upgrade
   ```
5. Run the server
   ```
   flask run
   ```
### Frontend Setup
1. Navigate to the frontend directory
   ```
   cd client
   ```
2. Install dependencies
   ```
   npm install
   ```
3. Start the development server
   ```
   npm run dev
   ```
## Usage
### Admin Dashboard
1. Login to the admin dashboard using admin credentials
2. Navigate to the spaces management section to add or edit spaces
3. Manage users and their permissions through the user management interface
4. View and monitor space bookings and transactions

### Client Interface
1. Browse available spaces without logging in
2. Create an account or login to make bookings
3. Select a space and specify booking duration
4. Complete the booking process:
   - Review space details and pricing
   - Accept terms and conditions
   - Process payment
   - Receive booking confirmation
5. View your booking history and manage upcoming bookings




