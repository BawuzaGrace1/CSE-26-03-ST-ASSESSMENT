# Videx: Technical Documentation

This document explains how Videx is built, how its parts fit together, and how
to extend it. For setup instructions and a quick overview, see
[README.md](README.md).

## Contents

1. [Architecture](#1-architecture)
2. [Data model](#2-data-model)
3. [Pages and URLs](#3-pages-and-urls)
4. [REST API](#4-rest-api)
5. [Validation and security](#5-validation-and-security)
6. [Django front end](#6-django-front-end)
7. [React front end](#7-react-front-end)
8. [Settings of note](#8-settings-of-note)
9. [Design notes](#9-design-notes)
10. [How to extend the project](#10-how-to-extend-the-project)
11. [Glossary](#11-glossary)

---

## 1. Architecture

```
                 ┌────────────────────────┐
  Browser  ───►  │  Django HTML pages     │ ──┐
                 │  (templates + JS)      │   │
                 └────────────────────────┘   │      ┌──────────────┐
                                              ├────► │ Django views │ ──► SQLite + media/
                 ┌────────────────────────┐   │      │ and REST API │
  Browser  ───►  │  React app (Vite)      │ ──┘      └──────────────┘
                 │  http://localhost:5173 │  JSON over HTTP
                 └────────────────────────┘
```

There is one backend (Django) and one database (SQLite). The Django pages and
the React app are two separate ways to use it, so a video uploaded in one shows
up in the other.

Both front ends use the same search and sorting code, `filter_videos()` in
`views.py`, so they always behave the same.

## 2. Data model

Defined in `Videx/models.py`.

### Video

| Field | Type | Notes |
|---|---|---|
| `title` | CharField(200) | Required |
| `description` | TextField | Optional |
| `quality` | CharField(10) | One of `360`, `720`, `1080` |
| `publish_date` | DateField | Required |
| `video_file` | FileField | Saved in `media/videos/`. mp4, webm or ogg only. Max 200 MB |
| `thumbnail` | ImageField | Saved in `media/thumbnails/`. Needs Pillow |
| `views` | PositiveInteger | Starts at 0. Goes up each time the video is opened |
| `likes` | PositiveInteger | Starts at 0. Never goes below 0 |
| `created_at` | DateTimeField | Set automatically. Videos are listed newest first |

### Comment

| Field | Type | Notes |
|---|---|---|
| `video` | ForeignKey(Video) | Deleting a video deletes its comments. Reverse name: `video.comments` |
| `name` | CharField(50) | Defaults to "Anonymous" |
| `text` | CharField(500) | Required |
| `created_at` | DateTimeField | Set automatically. Newest first |

### Migrations

| File | What it does |
|---|---|
| `0001_initial.py` | Creates the Video table |
| `0002_...` | Adds `views` and the video file validators |
| `0003_video_likes_comment.py` | Adds `likes` and creates the Comment table |

After changing a model, run `python manage.py makemigrations Videx` and then
`python manage.py migrate`.

## 3. Pages and URLs

Defined in `Videx/urls.py`.

| URL | View | Purpose |
|---|---|---|
| `/` | `landing` | Landing page with the JOIN button |
| `/videos/` | `video_list` | Video grid with search, filter, sort, pagination |
| `/videos/<id>/` | `watch_video` | Player, likes, comments. Adds one view |
| `/videos/<id>/delete/` | `delete_video` | POST only. Deletes the record and its files |
| `/videos/<id>/like/` | `like_video` | POST only. Returns `{"likes": n}` |
| `/videos/<id>/comment/` | `add_comment` | POST only. Returns the new comment as JSON |
| `/upload/` | `upload_video` | Upload form |
| `/admin/` | Django admin | Manage videos and comments |
| `/media/...` | static media | Serves uploaded files (development only) |

### Search parameters for `/videos/`

| Parameter | Values | Effect |
|---|---|---|
| `q` | any text | Matches title or description (case-insensitive) |
| `quality` | `360`, `720`, `1080` | Only that quality |
| `sort` | `oldest`, `views` | Default is newest first |
| `page` | number | Page of 8 results |

## 4. REST API

Base URL: `http://127.0.0.1:8000/api/`. Implemented in `Videx/api.py` with
serializer `VideoSerializer`. No login is needed.

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/videos/` | List videos (accepts `q`, `quality`, `sort`) |
| POST | `/videos/` | Create a video. Send `multipart/form-data` |
| GET | `/videos/<id>/` | One video |
| PUT / PATCH | `/videos/<id>/` | Update a video |
| DELETE | `/videos/<id>/` | Delete a video and its files |
| POST | `/videos/<id>/watch/` | Add one view. Returns the video |
| POST | `/videos/<id>/like/` | Like. Send `{"action": "unlike"}` to unlike. Returns the video |

The list endpoint returns a plain array with no pagination.

### Example video object

```json
{
  "id": 3,
  "title": "Class representative speech",
  "description": "",
  "quality": "720",
  "quality_label": "720p",
  "publish_date": "2026-06-05",
  "video_file": "http://127.0.0.1:8000/media/videos/speech.mp4",
  "thumbnail": "http://127.0.0.1:8000/media/thumbnails/speech.jpeg",
  "views": 12,
  "likes": 4,
  "created_at": "2026-06-05T09:00:00Z"
}
```

`views`, `likes` and `created_at` are read-only, so a client cannot set them.

### Error format

Validation errors return status 400 with a message per field:

```json
{ "video_file": ["File extension “exe” is not allowed. Allowed extensions are: mp4, webm, ogg."] }
```

### Try it from the terminal

```bash
curl http://127.0.0.1:8000/api/videos/
curl "http://127.0.0.1:8000/api/videos/?q=speech&quality=720&sort=views"
curl -X POST -H "Content-Type: application/json" -d '{"action":"like"}' \
     http://127.0.0.1:8000/api/videos/1/like/
```

## 5. Validation and security

- **File type:** only mp4, webm and ogg are accepted. This is checked in the
  model, so the HTML form, the API and the admin all enforce it. The file
  picker also filters by type, but that is only a convenience.
- **File size:** videos over 200 MB are rejected (`validate_video_size`). The
  React app checks this in the browser before uploading as well.
- **Required fields:** title, quality, date, video and thumbnail.
- **Cross-site request forgery (CSRF):** every Django form includes a CSRF
  token. The like and comment scripts send it in the `X-CSRFToken` header.
- **Safe output:** Django templates escape text automatically. The comment
  script inserts text with `textContent`, so HTML in a comment is shown as text
  and never run.
- **Delete and like use POST only,** so a link or an image tag cannot trigger
  them.
- **Cross-origin access (CORS):** only `http://localhost:5173` and
  `http://127.0.0.1:5173` may call the API from a browser.
- **Not yet protected:** there is no login, so anyone can upload, comment or
  delete. Likes are limited per browser only through local storage.

## 6. Django front end

Templates are in `Videx/templates/` and all extend `base.html`.

| Template | Notes |
|---|---|
| `base.html` | Shared head, Bootstrap, brand button styles, the dark-mode button and script |
| `landing.html` | Logo and JOIN button |
| `video_list.html` | Search form, results grid, pagination, live-search script |
| `upload_video.html` | Form with errors under each field and live previews |
| `watch_video.html` | Player, like button, comment form and list |

### Live search

The search form listens for typing. After a 300 ms pause it requests the same
`/videos/` URL with the form values, reads the returned HTML, and swaps only
the `#results` block. The address bar is updated, so the filtered view can be
copied or bookmarked. If JavaScript is off, the form still works as a normal
submit.

### Likes and comments

Both use `fetch()` to POST to the server and update the page from the JSON
reply, with no reload. The like state (liked or not) is stored in the browser's
local storage under the key `liked-<video id>`.

### Dark mode

Bootstrap 5.3 supports a `data-bs-theme` attribute on the `<html>` element.
The 🌙 / ☀️ button switches between `light` and `dark` and saves the choice in
local storage. A short script in the `<head>` applies the saved choice before
the page is drawn, so there is no white flash. Page colours use Bootstrap
variables such as `var(--bs-body-bg)` so they follow the theme.

## 7. React front end

Location: `Bawuza_Grace/frontend/`. Built with Vite and React 18, with plain
CSS and no extra libraries.

| File | Responsibility |
|---|---|
| `src/main.jsx` | Starts the app |
| `src/App.jsx` | Video grid, search and filters, player pop-up, delete, like, messages |
| `src/UploadForm.jsx` | Upload form, drag-and-drop areas, validation, progress bar |
| `src/api.js` | All calls to the Django API |
| `src/index.css` | Styles |

### Key ideas

- **State:** `useState` holds the video list, filters, loading and error
  state, and which video is playing.
- **Debounced search:** the search text is delayed by 300 ms (`useDebounced`)
  so the API is not called on every keystroke.
- **Upload progress:** `uploadVideo()` uses `XMLHttpRequest` instead of
  `fetch`, because only `XMLHttpRequest` reports upload progress.
- **Previews:** `URL.createObjectURL` shows the chosen file before upload and
  is revoked afterwards to free memory.
- **Server errors:** the API's per-field errors are shown under the matching
  inputs.
- **Player pop-up:** opening a video calls `/watch/` to count the view. The
  Esc key and clicking outside close it.

### Changing the API address

Edit `API` at the top of `src/api.js`. If the React app runs on a different
address, add it to `CORS_ALLOWED_ORIGINS` in the Django settings.

### Production build

```bash
npm run build
```

This creates a `dist/` folder of static files that any web server can host.

## 8. Settings of note

In `Videx_project/settings.py`:

| Setting | Value | Purpose |
|---|---|---|
| `INSTALLED_APPS` | adds `rest_framework`, `corsheaders`, `Videx` | API and CORS support |
| `MIDDLEWARE` | `CorsMiddleware` first | Lets the React app call the API |
| `MEDIA_URL` / `MEDIA_ROOT` | `/media/` and `<project>/media` | Where uploads are stored and served |
| `CORS_ALLOWED_ORIGINS` | the two Vite addresses | Browser access to the API |
| `FILE_UPLOAD_MAX_MEMORY_SIZE` | 10 MB | Larger uploads are streamed to disk |
| `DEBUG` | `True` | Development only |
| `SECRET_KEY` | hard-coded | Development only |

### Before deploying

- Set `DEBUG = False` and fill in `ALLOWED_HOSTS`.
- Move `SECRET_KEY` to an environment variable.
- Serve `media/` and static files with a real web server or cloud storage.
- Use a production database such as PostgreSQL.
- Add user accounts and login before allowing public uploads or deletes.

## 9. Design notes

### The upload preview overflow

The original upload box grew wider than its column when a video was chosen.
Two things caused it: a long file name in the file input, and a video element
that sized itself from the file. In a flex layout a child will not shrink below
its content width unless told to. The fix, used in both front ends:

- `min-width: 0` and `max-width: 100%` on the box, so it can shrink
- `overflow: hidden` so nothing spills out
- previews capped with `max-width: 100%` and `max-height: 240px`, with
  `object-fit: contain`
- file names cut off with an ellipsis

### Why files are deleted with the record

Deleting a database row alone leaves the video file on disk, which wastes
space. `delete_video` and the API delete call remove the files first, then the
row.

### Why views and likes use database-side updates

The code uses `F('views') + 1` so the database does the addition. That stays
correct when two people watch the same video at the same moment, unlike
reading a number, adding one in Python, and saving it back.

### Why `.mov` is not accepted

Most browsers cannot play QuickTime `.mov` files, so a `.mov` upload would look
fine in the list but not play. Convert to mp4 with
`ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4`.

## 10. How to extend the project

| Goal | Where to start |
|---|---|
| Add a field (for example, category) | Add it in `models.py`, run `makemigrations` and `migrate`, add it to `forms.py` (and the serializer), then show it in the templates |
| Add comments to the React app | Add a `Comment` serializer and `comments` API actions, then a comments list in the player pop-up |
| User accounts | Use `django.contrib.auth`, add a `owner` ForeignKey to `Video`, and only let owners delete |
| Automatic thumbnails | After upload, run ffmpeg to grab a frame and save it as the thumbnail |
| Automated tests | Write them in `Videx/tests.py` using Django's test client, and run `python manage.py test` |
| Search that ranks results | Switch to PostgreSQL full-text search |

## 11. Glossary

| Term | Meaning |
|---|---|
| API | A set of web addresses that return data (JSON) instead of pages |
| CORS | The browser rule that decides which websites may call an API |
| CSRF | An attack where another site tricks your browser into sending a request; Django blocks it with tokens |
| Debounce | Waiting until the user stops typing before acting |
| Migration | A file that describes a change to the database structure |
| Serializer | Converts a database object to JSON and back |
| Vite | The tool that runs and builds the React app |
