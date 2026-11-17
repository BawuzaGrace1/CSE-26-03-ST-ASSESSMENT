from rest_framework import serializers
from .models import Video


class VideoSerializer(serializers.ModelSerializer):
    quality_label = serializers.CharField(source='get_quality_display', read_only=True)

    class Meta:
        model = Video
        fields = ['id', 'title', 'description', 'quality', 'quality_label',
                  'publish_date', 'video_file', 'thumbnail', 'views', 'likes', 'created_at']
        read_only_fields = ['views', 'likes', 'created_at']
