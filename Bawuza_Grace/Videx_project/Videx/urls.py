from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .api import VideoViewSet

router = DefaultRouter()
router.register('videos', VideoViewSet, basename='api-video')

urlpatterns = [
    path('', views.landing, name='landing'),
    path('videos/', views.video_list, name='video_list'),
    path('videos/<int:pk>/', views.watch_video, name='watch_video'),
    path('videos/<int:pk>/delete/', views.delete_video, name='delete_video'),
    path('upload/', views.upload_video, name='upload_video'),
    path('api/', include(router.urls)),
]

urlpatterns += [
    path('videos/<int:pk>/like/', views.like_video, name='like_video'),
    path('videos/<int:pk>/comment/', views.add_comment, name='add_comment'),
]
