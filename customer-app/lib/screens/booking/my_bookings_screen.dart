import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/booking_card.dart';
import '../../widgets/empty_state_view.dart';
import '../profile/settings_screen.dart';
import 'booking_details_screen.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  final List<String> _filterTabs = ['All', 'Upcoming', 'Active', 'Completed'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).fetchMyBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final bookings = bookingProvider.filteredBookings;
    final l10n = AppLocalizations.of(context);

    String getTabLabel(String tab) {
      switch (tab) {
        case 'All':
          return l10n.tr('tab_all');
        case 'Upcoming':
          return l10n.tr('tab_upcoming');
        case 'Active':
          return l10n.tr('tab_active');
        case 'Completed':
          return l10n.tr('tab_completed');
        default:
          return tab;
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: AppTheme.textPrimary),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SettingsScreen()),
            );
          },
        ),
        title: Text(l10n.tr('my_bookings')),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => bookingProvider.fetchMyBookings(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await bookingProvider.fetchMyBookings();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Horizontal Filter Chips matching Figma
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _filterTabs.map((tab) {
                    final isSelected = tab == bookingProvider.selectedFilterTab;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: GestureDetector(
                        onTap: () => bookingProvider.setSelectedFilterTab(tab),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primaryBlue : AppTheme.surfaceWhite,
                            borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                            border: Border.all(
                              color: isSelected ? AppTheme.primaryBlue : AppTheme.borderLight,
                            ),
                          ),
                          child: Text(
                            getTabLabel(tab),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? Colors.white : AppTheme.textPrimary,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),

              // Bookings List or Empty State
              if (bookingProvider.isLoading && bookingProvider.myBookings.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40.0),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (bookings.isEmpty) ...[
                EmptyStateView(
                  title: '${l10n.tr('no_pending_requests')}',
                  message: l10n.tr('no_pending_requests_msg'),
                  icon: Icons.calendar_today_rounded,
                ),
              ] else ...[
                ...bookings.map((booking) {
                  return BookingCard(
                    booking: booking,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => BookingDetailsScreen(bookingId: booking.id),
                        ),
                      );
                    },
                  );
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
