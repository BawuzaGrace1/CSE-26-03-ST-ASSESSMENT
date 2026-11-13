# Videx

Videx is a small video-sharing web app. Users can upload a video with a
thumbnail, browse and search the list, watch a video, like it, comment on it,
and delete it. It comes with two front ends that share one backend:

- **Django pages** (server-rendered HTML with Bootstrap and a little JavaScript)
- **A React app** (Vite) that talks to a JSON API

> Author: Bawuza Grace · Project: CSE-26-03-ST-ASSESSMENT

---

## Features

| Feature | Django site | React app |
|---|---|---|
| Upload video + thumbnail with live preview | yes | yes (drag and drop + progress bar) |
| Form validation with error messages | yes | yes |
| Search, filter by quality, sort | yes (live, no reload) | yes (live) |
| Watch a video (view counter) | yes (watch page) | yes (pop-up player) |
| Like / unlike | yes | yes |
| Comments | yes | not yet |
| Delete with confirmation | yes | yes |
| Pagination (8 per page) | yes | not yet |
| Dark mode | yes | not yet |
| Admin panel (`/admin/`) | yes | n/a |

Allowed uploads: **mp4, webm, ogg**, up to **200 MB**.

---

## Tech stack

- Python 3, Django 6, Django REST Framework, django-cors-headers, Pillow
- SQLite database
- Bootstrap 5.3 (Django pages)
- React 18 and Vite 5 (React app)

---

## Project structure

```
CSE-26-03-ST-ASSESSMENT/
├── README.md
├── DOCUMENTATION.md
└── Bawuza_Grace/
    ├── Videx_project/            Django backend
    │   ├── manage.py
    │   ├── Videx_project/        project settings and root URLs
    │   └── Videx/                the app
    │       ├── models.py         Video and Comment
    │       ├── forms.py          upload form
    │       ├── views.py          pages, like, comment, delete
    │       ├── api.py            REST API
    │       ├── serializers.py
    │       ├── urls.py
    │       ├── templates/        base, landing, list, upload, watch
    │       └── migrations/
    └── frontend/                 React app (Vite)
        └── src/                  App.jsx, UploadForm.jsx, api.js, index.css
```

---

## Getting started

You need **Python 3.12+** and, for the React app, **Node.js 18+**.
The commands below are for Git Bash on Windows. On PowerShell, activate the
virtual environment with `my_env\Scripts\Activate.ps1` instead.

### 1. Run the backend

```bash
cd Bawuza_Grace/Videx_project
python -m venv my_env                 # first time only
source my_env/Scripts/activate
pip install Django djangorestframework django-cors-headers Pillow
python manage.py migrate
python manage.py runserver
```

Open <http://127.0.0.1:8000/> and click **JOIN**.

Optional: create an admin account to manage videos and comments.

```bash
python manage.py createsuperuser
```

Then go to <http://127.0.0.1:8000/admin/>.

### 2. Run the React app (second terminal)

```bash
cd Bawuza_Grace/frontend
npm install
npm run dev
```

Open <http://localhost:5173/>. Keep the Django server running, because the
React app reads its data from it.

---

## Using the app

1. Click **Add Video**, fill in the title, quality and date, choose a video and
   a thumbnail, and press **Upload**.
2. Use the search box and the quality and sort menus to find videos.
3. Click a video to watch it. Use the heart to like it.
4. On the Django watch page, add comments at the bottom.
5. Press **Delete** on a card to remove a video and its files.

---

## API in brief

Base URL: `http://127.0.0.1:8000/api/`

| Method | Path | What it does |
|---|---|---|
| GET | `/videos/` | List videos. Query: `q`, `quality` (360, 720, 1080), `sort` (`oldest` or `views`) |
| POST | `/videos/` | Upload a video (multipart form) |
| GET / PUT / PATCH / DELETE | `/videos/<id>/` | Read, update or delete one video |
| POST | `/videos/<id>/watch/` | Add one view |
| POST | `/videos/<id>/like/` | Like; send `{"action": "unlike"}` to unlike |

Full details are in [DOCUMENTATION.md](DOCUMENTATION.md).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `can't open file 'manage.py'` | You are in the wrong folder. `cd` into `Videx_project`. |
| Prompt has no `(my_env)` | Run `source my_env/Scripts/activate`. |
| `pip install -r ..\requirements.txt` fails in Git Bash | Backslashes do not work in Git Bash. Use forward slashes, or install the packages by name. |
| React app says "Is the Django server running on port 8000?" | Start `python manage.py runserver` in another terminal. |
| A `.mov` video will not upload or play | Convert it: `ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4` |
| `No migrations to apply` plus a warning about model changes | Run `python manage.py makemigrations Videx`, then `python manage.py migrate`. |

---

## Known limitations

- There are no user accounts. Anyone can upload, comment and delete.
- Likes are remembered per browser (in local storage), so they can be repeated
  from another browser.
- Files are stored on the local disk in `media/`.
- The settings are for development (`DEBUG = True`, a fixed secret key).
  Change them before deploying.
- Automated tests are not included yet.

## Ideas for the future

User accounts and ownership, categories or tags, automatic thumbnails from the
video, comments and dark mode in the React app, and automated tests.
