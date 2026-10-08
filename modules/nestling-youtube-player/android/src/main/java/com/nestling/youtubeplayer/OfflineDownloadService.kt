package com.nestling.youtubeplayer

import android.app.Notification
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadNotificationHelper
import androidx.media3.exoplayer.offline.DownloadService
import androidx.media3.exoplayer.scheduler.Scheduler

class OfflineDownloadService : DownloadService(4101, DEFAULT_FOREGROUND_NOTIFICATION_UPDATE_INTERVAL,
  "saved_videos", R.string.saved_videos_channel, 0) {
  override fun getDownloadManager() = OfflineDownloads.manager(this)
  override fun getScheduler(): Scheduler? = null
  override fun getForegroundNotification(downloads: MutableList<Download>, notMetRequirements: Int): Notification =
    DownloadNotificationHelper(this, "saved_videos").buildProgressNotification(
      this, android.R.drawable.stat_sys_download, null, "Saving videos for travel", downloads, notMetRequirements)
}
