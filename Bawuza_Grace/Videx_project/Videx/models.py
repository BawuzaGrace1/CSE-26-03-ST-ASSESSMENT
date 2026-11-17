from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models

MAX_VIDEO_MB = 200


def validate_video_size(f):
    if f.size > MAX_VIDEO_MB * 1024 * 1024:
        raise ValidationError(f"Video is too large. Maximum size is {MAX_VIDEO_MB} MB.")


class Video(models.Model):
    QUALITY_CHOICES = [
        ('360', '360p'),
        ('720', '720p'),
        ('1080', '1080p'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quality = models.CharField(max_length=10, choices=QUALITY_CHOICES)
    publish_date = models.DateField()

    video_file = models.FileField(
        upload_to='videos/',
        validators=[
            FileExtensionValidator(['mp4', 'webm', 'ogg']),
            validate_video_size,
        ],
    )
    thumbnail = models.ImageField(upload_to='thumbnails/')

    views = models.PositiveIntegerField(default=0)
    likes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Comment(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='comments')
    name = models.CharField(max_length=50, default='Anonymous')
    text = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name}: {self.text[:30]}"
