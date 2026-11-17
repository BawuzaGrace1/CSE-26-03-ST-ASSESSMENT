from django.contrib import admin
from .models import Comment, Video


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('title', 'quality', 'publish_date', 'views', 'likes', 'created_at')
    list_filter = ('quality', 'publish_date')
    search_fields = ('title', 'description')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('name', 'text', 'video', 'created_at')
