from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import F, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import VideoForm
from .models import Video


def landing(request):
    return render(request, 'landing.html')


def filter_videos(params):
    """Shared by the template view and the API: search + quality + sort."""
    videos = Video.objects.all()
    q = (params.get('q') or '').strip()
    quality = params.get('quality') or ''
    sort = params.get('sort') or ''

    if q:
        videos = videos.filter(Q(title__icontains=q) | Q(description__icontains=q))
    if quality:
        videos = videos.filter(quality=quality)
    if sort == 'views':
        videos = videos.order_by('-views', '-created_at')
    elif sort == 'oldest':
        videos = videos.order_by('created_at')
    return videos


def video_list(request):
    videos = filter_videos(request.GET)
    page = Paginator(videos, 8).get_page(request.GET.get('page'))

    params = request.GET.copy()
    params.pop('page', None)

    return render(request, 'video_list.html', {
        'page': page,
        'q': request.GET.get('q', ''),
        'quality': request.GET.get('quality', ''),
        'sort': request.GET.get('sort', ''),
        'querystring': params.urlencode(),
        'qualities': Video.QUALITY_CHOICES,
    })


def upload_video(request):
    if request.method == 'POST':
        form = VideoForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, 'Video added successfully')
            return redirect('video_list')
    else:
        form = VideoForm()
    return render(request, 'upload_video.html', {'form': form})


def watch_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    Video.objects.filter(pk=pk).update(views=F('views') + 1)
    video.refresh_from_db()
    return render(request, 'watch_video.html', {'video': video})


@require_POST
def delete_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    video.video_file.delete(save=False)
    video.thumbnail.delete(save=False)
    video.delete()
    messages.success(request, 'Video deleted')
    return redirect('video_list')


from django.http import JsonResponse
from .models import Comment


@require_POST
def like_video(request, pk):
    video = get_object_or_404(Video, pk=pk)
    if request.POST.get('action') == 'unlike':
        Video.objects.filter(pk=pk, likes__gt=0).update(likes=F('likes') - 1)
    else:
        Video.objects.filter(pk=pk).update(likes=F('likes') + 1)
    video.refresh_from_db()
    return JsonResponse({'likes': video.likes})


@require_POST
def add_comment(request, pk):
    video = get_object_or_404(Video, pk=pk)
    name = (request.POST.get('name') or '').strip()[:50] or 'Anonymous'
    text = (request.POST.get('text') or '').strip()[:500]
    if not text:
        return JsonResponse({'error': 'Write something first.'}, status=400)
    c = Comment.objects.create(video=video, name=name, text=text)
    return JsonResponse({
        'name': c.name, 'text': c.text,
        'created': c.created_at.strftime('%d %b %Y, %H:%M'),
        'count': video.comments.count(),
    })
