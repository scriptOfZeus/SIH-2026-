import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/booking_provider.dart';
import '../../providers/customer_provider.dart';
import '../../widgets/worker_card.dart';
import '../profile/settings_screen.dart';
import '../worker/worker_profile_screen.dart';
import '../worker/worker_search_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final customerProvider = Provider.of<CustomerProvider>(context, listen: false);
      final bookingProvider = Provider.of<BookingProvider>(context, listen: false);

      customerProvider.fetchProfile();
      bookingProvider.fetchNearbyWorkers(
        lat: customerProvider.profile?.defaultLat ?? 22.5726,
        lng: customerProvider.profile?.defaultLng ?? 88.3639,
      );
      bookingProvider.fetchMyBookings();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _navigateToCategory(String category) {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    bookingProvider.setSelectedCategory(category);
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => WorkerSearchScreen(initialCategory: category),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final customerProvider = Provider.of<CustomerProvider>(context);
    final bookingProvider = Provider.of<BookingProvider>(context);
    final l10n = AppLocalizations.of(context);

    final address = customerProvider.profile?.defaultAddress ?? 'Kolkata, WB';

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
        title: Text(
          l10n.tr('app_title'),
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppTheme.primaryBlue,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              },
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.lightBlueBg,
                  border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.2)),
                ),
                child: Center(
                  child: Text(
                    customerProvider.profile?.fullName?.isNotEmpty == true
                        ? customerProvider.profile!.fullName![0].toUpperCase()
                        : 'C',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryBlue,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await customerProvider.fetchProfile();
          await bookingProvider.fetchNearbyWorkers();
          await bookingProvider.fetchMyBookings();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Location Selector Bar
              Row(
                children: [
                  const Icon(Icons.location_on, size: 18, color: AppTheme.primaryBlue),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      address,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right_rounded, size: 18, color: AppTheme.textMuted),
                ],
              ),
              const SizedBox(height: 16),

              // Search Bar
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                ),
                child: TextField(
                  controller: _searchController,
                  onSubmitted: (val) {
                    if (val.trim().isNotEmpty) {
                      _navigateToCategory(val.trim().toLowerCase());
                    }
                  },
                  decoration: InputDecoration(
                    hintText: l10n.tr('search_hint'),
                    hintStyle: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                    ),
                    prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textMuted),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Section Categories Title
              Text(
                l10n.tr('categories'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 14),

              // Custom Category Grid
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Feature Large Electrician Card
                  Expanded(
                    flex: 1,
                    child: GestureDetector(
                      onTap: () => _navigateToCategory('electrician'),
                      child: Container(
                        height: 164,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCE8FC),
                          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                        ),
                        child: Stack(
                          children: [
                            Positioned(
                              right: -10,
                              bottom: -10,
                              child: Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white.withOpacity(0.4),
                                ),
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: const BoxDecoration(
                                    color: AppTheme.primaryBlue,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.electrical_services_rounded, color: Colors.white, size: 22),
                                ),
                                const Spacer(),
                                Text(
                                  l10n.tr('electrician'),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // 2x2 Sub-Grid (Plumber, Cleaner)
                  Expanded(
                    flex: 1,
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _CategoryMiniCard(
                                title: l10n.tr('plumber'),
                                icon: Icons.plumbing_rounded,
                                onTap: () => _navigateToCategory('plumber'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _CategoryMiniCard(
                                title: l10n.tr('cleaner'),
                                icon: Icons.cleaning_services_rounded,
                                onTap: () => _navigateToCategory('cleaner'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Bottom Category Row (Carpenter & Painter)
              Row(
                children: [
                  Expanded(
                    child: _CategoryMiniCard(
                      title: l10n.tr('carpenter'),
                      icon: Icons.carpenter_rounded,
                      onTap: () => _navigateToCategory('carpenter'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _CategoryMiniCard(
                      title: l10n.tr('painter'),
                      icon: Icons.format_paint_rounded,
                      onTap: () => _navigateToCategory('painter'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Section Nearby Verified Workers
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.tr('nearby_workers'),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textPrimary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  TextButton(
                    onPressed: () => _navigateToCategory('electrician'),
                    child: Text(
                      l10n.tr('see_all'),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Workers List
              if (bookingProvider.isLoading && bookingProvider.nearbyWorkers.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24.0),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (bookingProvider.nearbyWorkers.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceWhite,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                  ),
                  child: Center(
                    child: Text(
                      l10n.tr('no_workers_found'),
                      style: const TextStyle(color: AppTheme.textSecondary),
                    ),
                  ),
                )
              else
                ...bookingProvider.nearbyWorkers.take(5).map((worker) {
                  return WorkerCard(
                    worker: worker,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => WorkerProfileScreen(worker: worker),
                        ),
                      );
                    },
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryMiniCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback onTap;

  const _CategoryMiniCard({
    required this.title,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 77,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFDCE8FC),
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 18, color: AppTheme.primaryBlue),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
