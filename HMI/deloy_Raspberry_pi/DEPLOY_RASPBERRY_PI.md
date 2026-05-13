# 🚀 HMI Deployment Guide for Raspberry Pi

This document explains step by step how to deploy:

- 🐍 the Flask backend for Modbus TCP reading
- 🌐 the frontend build served by `apache2`
- 🖥️ kiosk mode so the Raspberry Pi opens the HMI automatically in full screen at boot

This guide is based on the current code in this repository:

- Frontend: React + Vite
- Backend: Flask + `pymodbus`
- Frontend production output: `HMI/build`
- Backend API: `http://127.0.0.1:8001/api/...`
- Frontend fetches data using relative paths like `/api/...`

## 🧭 1. Recommended deployment architecture

```text
Chromium kiosk
  -> opens http://127.0.0.1

Apache2 :80
  -> /            => serves static frontend files from HMI/build
  -> /api/*       => reverse proxy to Flask at 127.0.0.1:8001

Flask backend :8001
  -> reads Modbus TCP data from PLC/device
```

With this setup:

- ✅ the browser only talks to one origin: `http://<Pi-IP>`
- ✅ the frontend code does not need any fetch path changes
- ✅ `apache2` serves both the frontend and the backend proxy

## 📋 2. Prerequisites

Make sure you have:

- Raspberry Pi OS Desktop installed
- a user with `sudo` access
- the Raspberry Pi connected to the same network as the PLC / Modbus TCP device
- the repository already cloned onto the Pi, for example:

```bash
cd /home/pi
git clone <repo-url> Ormin_Project_V5
```

In this guide, the project path is assumed to be:

```text
/home/pi/Ormin_Project_V5/HMI
```

If your real path is different, replace it everywhere in the commands below.

## 🛠️ 3. Update the system and install required packages

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y apache2 python3 python3-venv python3-pip nodejs npm chromium-browser unclutter
```

Check versions:

```bash
python3 --version
node --version
npm --version
apache2 -v
chromium-browser --version
```

If `chromium-browser` does not exist on your Raspberry Pi OS image, try:

```bash
chromium --version
```

If needed, replace `chromium-browser` with `chromium` in the kiosk section later.

## 📁 4. Prepare the source code on the Pi

```bash
cd /home/pi/Ormin_Project_V5/HMI
```

Check the main project folders:

```bash
ls
```

You should see at least:

- `backend/`
- `src/`
- `public/`
- `package.json`
- `vite.config.mjs`

## ⚙️ 5. Configure the backend Modbus connection

The current backend config file is:

```text
/home/pi/Ormin_Project_V5/HMI/backend/backend_config.json
```

Open it:

```bash
nano /home/pi/Ormin_Project_V5/HMI/backend/backend_config.json
```

Check and update the `modbus` block:

```json
"modbus": {
  "host": "10.0.0.205",
  "port": 502,
  "unit_id": 16,
  "timeout_seconds": 3,
  "poll_interval_ms": 2000
}
```

Meaning:

- `host`: IP address of the PLC / Modbus TCP device
- `port`: usually `502`
- `unit_id`: slave ID / unit ID
- `timeout_seconds`: timeout for each read
- `poll_interval_ms`: frontend polling interval

Save the file, then test network access to the PLC:

```bash
ping -c 4 10.0.0.205
```

If the Pi cannot reach the PLC, fix the network issue first before continuing.

## 🐍 6. Install and test the Flask backend

### 6.1 Create a virtual environment

```bash
cd /home/pi/Ormin_Project_V5/HMI
python3 -m venv .venv
```

### 6.2 Install backend dependencies

```bash
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

The current `requirements.txt` includes:

- `Flask`
- `flask-cors`
- `pymodbus`

### 6.3 Run the backend manually for testing

```bash
cd /home/pi/Ormin_Project_V5/HMI
source .venv/bin/activate
python backend/app.py
```

The backend listens on:

```text
http://0.0.0.0:8001
```

Open a second terminal on the Pi and test:

```bash
curl http://127.0.0.1:8001/api/overview
curl http://127.0.0.1:8001/api/engine
curl http://127.0.0.1:8001/api/pid
curl http://127.0.0.1:8001/api/debug/modbus-snapshot
```

Expected result:

- ✅ JSON data is returned if Modbus reads succeed
- ⚠️ or an error JSON appears, which helps debugging

Stop the manual backend test with `Ctrl + C` once everything looks correct.

## 🔁 7. Create a `systemd` service for the backend

Create the service file:

```bash
sudo nano /etc/systemd/system/ormin-hmi-backend.service
```

Use this content:

```ini
[Unit]
Description=Ormin HMI Flask Backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Ormin_Project_V5/HMI
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/pi/Ormin_Project_V5/HMI/.venv/bin/python /home/pi/Ormin_Project_V5/HMI/backend/app.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

If your Raspberry Pi username is not `pi`, update the `User=` line.

Reload and enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ormin-hmi-backend.service
sudo systemctl start ormin-hmi-backend.service
```

Check status:

```bash
sudo systemctl status ormin-hmi-backend.service
```

Watch logs in real time:

```bash
journalctl -u ormin-hmi-backend.service -f
```

If the backend is healthy, this should work:

```bash
curl http://127.0.0.1:8001/api/overview
```

## 🏗️ 8. Build the frontend for production

### 8.1 Install frontend dependencies

```bash
cd /home/pi/Ormin_Project_V5/HMI
npm install
```

### 8.2 Build the app

```bash
npm run build
```

According to `vite.config.mjs`, the frontend output is:

```text
/home/pi/Ormin_Project_V5/HMI/build
```

Verify it:

```bash
ls /home/pi/Ormin_Project_V5/HMI/build
```

You should see at least:

- `index.html`
- `assets/`

## 🌐 9. Configure Apache2 to serve the frontend and proxy the API

### 9.1 Enable required Apache modules

```bash
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
```

### 9.2 Create the HMI site config

```bash
sudo nano /etc/apache2/sites-available/ormin-hmi.conf
```

Use this content:

```apache
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /home/pi/Ormin_Project_V5/HMI/build

    <Directory /home/pi/Ormin_Project_V5/HMI/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:8001/api
    ProxyPassReverse /api http://127.0.0.1:8001/api

    RewriteEngine On

    # If the request is not a real file/folder and is not /api,
    # serve index.html so React Router keeps working.
    RewriteCond %{REQUEST_URI} !^/api
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-f
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-d
    RewriteRule ^ /index.html [L]

    ErrorLog ${APACHE_LOG_DIR}/ormin-hmi-error.log
    CustomLog ${APACHE_LOG_DIR}/ormin-hmi-access.log combined
</VirtualHost>
```

### 9.3 Disable the default site and enable the new one

```bash
sudo a2dissite 000-default.conf
sudo a2ensite ormin-hmi.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

If `configtest` prints `Syntax OK`, the site config is valid.

### 9.4 Test the frontend through Apache

Test on the Pi:

```bash
curl http://127.0.0.1
curl http://127.0.0.1/api/overview
```

Test from another machine on the same network:

```text
http://<Raspberry-Pi-IP>/
```

To see the Pi IP address:

```bash
hostname -I
```

## 🔐 10. Make sure Apache can read the project files

If the frontend does not load static files, make sure directory permissions allow Apache to read them:

```bash
sudo chmod o+rx /home/pi
sudo chmod -R o+rX /home/pi/Ormin_Project_V5/HMI/build
```

If needed, you can also fix ownership:

```bash
sudo chown -R pi:pi /home/pi/Ormin_Project_V5
```

Only run that `chown` if the project should really belong to user `pi`.

## 🖥️ 11. Configure kiosk mode on Raspberry Pi

Goal:

- the Pi auto-logs into Desktop
- Chromium opens automatically in full screen
- the mouse cursor hides when idle
- the HMI is shown at `http://127.0.0.1`

### 11.1 Enable Desktop auto login

Run:

```bash
sudo raspi-config
```

Go to:

```text
1 System Options
  -> S5 Boot / Auto Login
  -> B4 Desktop Autologin
```

Then exit `raspi-config`.

### 11.2 Create the kiosk launch script

```bash
mkdir -p /home/pi/kiosk
nano /home/pi/kiosk/start-kiosk.sh
```

Use this content:

```bash
#!/bin/bash
set -e

xset s off
xset -dpms
xset s noblank

unclutter -idle 0.5 -root &

chromium-browser \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --incognito \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  http://127.0.0.1
```

If your OS uses `chromium` instead of `chromium-browser`, update that command.

Make it executable:

```bash
chmod +x /home/pi/kiosk/start-kiosk.sh
```

### 11.3 Create the Desktop autostart entry

```bash
mkdir -p /home/pi/.config/autostart
nano /home/pi/.config/autostart/ormin-hmi-kiosk.desktop
```

Use this content:

```ini
[Desktop Entry]
Type=Application
Name=Ormin HMI Kiosk
Exec=/home/pi/kiosk/start-kiosk.sh
X-GNOME-Autostart-enabled=true
```

### 11.4 Reboot and test kiosk mode

```bash
sudo reboot
```

After reboot, you should get:

- ✅ backend auto-started by `systemd`
- ✅ `apache2` running
- ✅ Desktop auto-login
- ✅ Chromium opened full screen on the HMI page

## 🔄 12. Update workflow when new code is deployed

Whenever you pull new code:

```bash
cd /home/pi/Ormin_Project_V5
git pull
```

If backend dependencies changed:

```bash
cd /home/pi/Ormin_Project_V5/HMI
source .venv/bin/activate
pip install -r backend/requirements.txt
```

If frontend code changed:

```bash
cd /home/pi/Ormin_Project_V5/HMI
npm install
npm run build
```

Restart services:

```bash
sudo systemctl restart ormin-hmi-backend.service
sudo systemctl restart apache2
```

If kiosk is already open and you need a quick refresh:

- press `Alt + F4` to close Chromium
- reopen Chromium
- or reboot the Pi

## ✅ 13. Post-deployment checklist

Recommended checks:

1. Backend service:

```bash
sudo systemctl status ormin-hmi-backend.service
```

2. Apache:

```bash
sudo systemctl status apache2
```

3. API:

```bash
curl http://127.0.0.1/api/overview
```

4. Frontend:

- open `http://127.0.0.1`
- verify the `Overview`, `Engine`, and `P&ID` pages

5. Modbus debug endpoint:

```bash
curl http://127.0.0.1/api/debug/modbus-snapshot
```

## 🧯 14. Troubleshooting

### 14.1 Frontend loads but no live data appears

Check:

```bash
curl http://127.0.0.1:8001/api/overview
curl http://127.0.0.1/api/overview
```

If `:8001` works directly but Apache does not, the problem is usually in `ProxyPass`.

If both fail, inspect backend logs:

```bash
journalctl -u ormin-hmi-backend.service -f
```

### 14.2 Apache returns 403 or 404

Check:

```bash
sudo apache2ctl configtest
sudo tail -f /var/log/apache2/ormin-hmi-error.log
```

Also verify that `DocumentRoot` points to:

```text
/home/pi/Ormin_Project_V5/HMI/build
```

### 14.3 Backend cannot connect to Modbus

Recheck:

- the PLC IP in `backend/backend_config.json`
- port `502`
- `unit_id`
- network cable / switch / VLAN
- firewall rules if any

Quick network test:

```bash
ping -c 4 10.0.0.205
```

### 14.4 Chromium does not auto-open after boot

Check the autostart files:

```bash
cat /home/pi/.config/autostart/ormin-hmi-kiosk.desktop
cat /home/pi/kiosk/start-kiosk.sh
```

Check permissions:

```bash
ls -l /home/pi/kiosk/start-kiosk.sh
```

Test the script manually from a Desktop terminal:

```bash
/home/pi/kiosk/start-kiosk.sh
```

### 14.5 The display still blanks after some time

Make sure the kiosk script still contains:

```bash
xset s off
xset -dpms
xset s noblank
```

If the screen still blanks, check `raspi-config` for any screen blanking option and disable it there too.

## 📌 15. Important file locations

- Backend code:
  `/home/pi/Ormin_Project_V5/HMI/backend/app.py`
- Backend config:
  `/home/pi/Ormin_Project_V5/HMI/backend/backend_config.json`
- Frontend build output:
  `/home/pi/Ormin_Project_V5/HMI/build`
- Backend service:
  `/etc/systemd/system/ormin-hmi-backend.service`
- Apache site:
  `/etc/apache2/sites-available/ormin-hmi.conf`
- Kiosk script:
  `/home/pi/kiosk/start-kiosk.sh`
- Kiosk autostart:
  `/home/pi/.config/autostart/ormin-hmi-kiosk.desktop`

## ⚡ 16. Quick command summary

### Build the frontend

```bash
cd /home/pi/Ormin_Project_V5/HMI
npm run build
```

### Restart the backend

```bash
sudo systemctl restart ormin-hmi-backend.service
```

### Restart Apache

```bash
sudo systemctl restart apache2
```

### Watch backend logs

```bash
journalctl -u ormin-hmi-backend.service -f
```

### Test the API

```bash
curl http://127.0.0.1/api/overview
```

## 🌟 17. Future improvements

Once the system is stable, you may want to improve it further:

- switch the backend from the Flask development server to `gunicorn`
- add a `/api/health` endpoint
- add a watchdog or auto-recovery `systemd` setup
- add caching or rate limiting if polling becomes more frequent
- create an automated deployment script

For the current codebase, the approach in this document is simple, practical, and easy to debug on Raspberry Pi.
