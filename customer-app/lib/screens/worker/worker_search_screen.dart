import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/worker_card.dart';
import '../booking/create_booking_screen.dart';
import 'worker_profile_screen.dart';

class WorkerSearchScreen extends StatefulWidget {
  final String initialCategory;

  const WorkerSearchScreen({
    super.key,
    this.initialCategory = 'plumber',
  });

  @override
  State<WorkerSearchScreen> createState() => _WorkerSearchScreenState();
}

class _WorkerSearchScreenState extends State<WorkerSearchScreen> {
  late String _selectedCategory;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
      bookingProvider.setSelectedCategory(_selectedCategory);
      bookingProvider.fetchNearbyWorkers(category: _selectedCategory);
    });
  }

  void _onCategoryFilter(String category) {
    setState(() => _selectedCategory = category);
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    bookingProvider.setSelectedCategory(category);
    bookingProvider.fetchNearbyWorkers(category: category);
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final l10n = AppLocalizations.of(context);

    final localizedTrade = l10n.tr(_selectedCategory.toLowerCase());

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(l10n.tr('app_title')),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_rounded, color: AppTheme.textPrimary),
            onPressed: () {
              // Open category switcher modal
              showModalBottomSheet(
                context: context,
                backgroundColor: AppTheme.surfaceWhite,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                builder: (_) {
                  return Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.tr('filter_skill_category'),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: ['electrician', 'plumber', 'cleaner', 'carpenter', 'painter'].map((cat) {
                            final isSelected = cat == _selectedCategory;
                            return ChoiceChip(
                              label: Text(l10n.tr(cat).toUpperCase()),
                              selected: isSelected,
                              selectedColor: AppTheme.primaryBlue,
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : AppTheme.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                              onSelected: (_) {
                                Navigator.pop(context);
                                _onCategoryFilter(cat);
                              },
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await bookingProvider.fetchNearbyWorkers(category: _selectedCategory);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Title & Subtitle matching Figma
              Text(
                l10n.tr('workers_near_you', params: {'trade': localizedTrade}),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textPrimary,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.tr('showing_verified'),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 20),

              // Workers list or Empty State
              if (bookingProvider.isLoading && bookingProvider.nearbyWorkers.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40.0),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (bookingProvider.nearbyWorkers.isEmpty) ...[
                EmptyStateView(
                  title: l10n.tr('no_workers_title'),
                  message: l10n.tr('no_workers_subtitle', params: {'trade': localizedTrade}),
                  icon: Icons.location_off_rounded,
                  buttonText: l10n.tr('change_search_area'),
                  onButtonPressed: () {
                    bookingProvider.fetchNearbyWorkers(
                      category: _selectedCategory,
                      radiusKm: 30.0,
                    );
                  },
                ),
              ] else ...[
                ...bookingProvider.nearbyWorkers.map((worker) {
                  return WorkerCard(
                    worker: worker,
                    showRateAndButton: true,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => WorkerProfileScreen(worker: worker),
                        ),
                      );
                    },
                    onBookNow: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CreateBookingScreen(worker: worker),
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
