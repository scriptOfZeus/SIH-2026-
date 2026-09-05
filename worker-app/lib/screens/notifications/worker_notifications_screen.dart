import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../models/notification_model.dart';

class WorkerNotificationsScreen extends StatefulWidget {
  const WorkerNotificationsScreen({super.key});

  @override
  State<WorkerNotificationsScreen> createState() => _WorkerNotificationsScreenState();
}

class _WorkerNotificationsScreenState extends State<WorkerNotificationsScreen> {
  final List<WorkerNotification> _notifications = [
    WorkerNotification(
      id: 'notif-1',
      title: '⚡ Emergency Dispatch Alert',
      message: 'New urgent electrical fault assigned near HSR Layout. 60s acceptance active.',
      time: '2 mins ago',
      isEmergency: true,
      isRead: false,
      type: 'emergency_dispatch',
    ),
    WorkerNotification(
      id: 'notif-2',
      title: 'Job Completed & Paid',
      message: '₹850 payment received for service #BK9021. Payout credited to cooperative balance.',
      time: '1 hour ago',
      isEmergency: false,
      isRead: true,
      type: 'payout',
    ),
    WorkerNotification(
      id: 'notif-3',
      title: 'Monthly Welfare Contribution',
      message: '₹150 allocated to your state worker healthcare and insurance fund.',
      time: 'Yesterday',
      isEmergency: false,
      isRead: true,
      type: 'system',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = WorkerLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        title: Text(l10n.tr('notifications_alerts')),
        actions: [
          TextButton(
            onPressed: () {
              setState(() {
                for (var i = 0; i < _notifications.length; i++) {
                  _notifications[i] = _notifications[i].copyWith(isRead: true);
                }
              });
            },
            child: Text(l10n.tr('mark_all_read')),
          ),
        ],
      ),
      body: _notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 54, color: Colors.grey.shade400),
                  const SizedBox(height: 12),
                  Text(
                    l10n.tr('no_notifications_yet'),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              itemCount: _notifications.length,
              itemBuilder: (context, index) {
                final notif = _notifications[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: notif.isRead ? Colors.white : const Color(0xFFF4F8FE),
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    border: Border.all(
                      color: notif.isEmergency
                          ? AppTheme.emergencyBorder
                          : (notif.isRead ? AppTheme.borderLight : const Color(0xFFBFDBFE)),
                      width: notif.isEmergency ? 1.5 : 1,
                    ),
                    boxShadow: AppTheme.cardShadow,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: notif.isEmergency
                              ? AppTheme.emergencyLightBg
                              : const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          notif.isEmergency ? Icons.bolt : Icons.notifications,
                          color: notif.isEmergency ? AppTheme.emergencyOrange : AppTheme.primaryBlue,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  notif.title,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: notif.isEmergency ? AppTheme.emergencyOrange : AppTheme.textDark,
                                  ),
                                ),
                                Text(
                                  notif.time,
                                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              notif.message,
                              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.3),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
