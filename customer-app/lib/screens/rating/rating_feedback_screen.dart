import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/app_button.dart';
import '../../widgets/star_rating.dart';
import '../home/main_navigation_screen.dart';

class RatingFeedbackScreen extends StatefulWidget {
  final BookingModel booking;

  const RatingFeedbackScreen({super.key, required this.booking});

  @override
  State<RatingFeedbackScreen> createState() => _RatingFeedbackScreenState();
}

class _RatingFeedbackScreenState extends State<RatingFeedbackScreen> {
  int _rating = 5;
  final TextEditingController _commentController = TextEditingController();
  final Set<String> _selectedTags = {'tag_punctual', 'tag_professional'};

  final List<String> _availableTags = [
    'tag_punctual',
    'tag_professional',
    'tag_great_comm',
    'tag_clean_workspace',
    'tag_fair_pricing',
  ];

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmitFeedback() async {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final l10n = AppLocalizations.of(context);

    String comment = _commentController.text.trim();
    if (_selectedTags.isNotEmpty) {
      final tagsStr = _selectedTags.map((k) => l10n.tr(k)).join(', ');
      comment = comment.isNotEmpty ? '$tagsStr. $comment' : tagsStr;
    }

    final success = await bookingProvider.submitRating(
      bookingId: widget.booking.id,
      rating: _rating,
      comment: comment.isNotEmpty ? comment : null,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.tr('feedback_recorded'))),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen(initialIndex: 1)),
        (route) => false,
      );
    } else if (mounted && bookingProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(bookingProvider.errorMessage!),
          backgroundColor: AppTheme.dangerRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final l10n = AppLocalizations.of(context);
    final workerName = widget.booking.workerName ?? l10n.tr('cooperative_partner');

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
              (route) => false,
            );
          },
        ),
        title: Text(l10n.tr('app_title')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          children: [
            // Center Profile Avatar with Verified Badge
            Center(
              child: Stack(
                children: [
                  Container(
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.lightBlueBg,
                      border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.15), width: 2),
                    ),
                    child: Center(
                      child: Text(
                        workerName.isNotEmpty ? workerName[0].toUpperCase() : 'W',
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppTheme.primaryBlue),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 2,
                    bottom: 2,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: AppTheme.verifiedGreen,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: const Icon(Icons.check, size: 14, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Title & Subtitle
            Text(
              l10n.translate('rate_service_title', params: {'worker': workerName}),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.tr('feedback_subtitle'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 24),

            // Star Rating Container matching Figma
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceWhite,
                borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                boxShadow: AppTheme.cardShadow,
                border: Border.all(color: AppTheme.borderLight.withOpacity(0.8)),
              ),
              child: Column(
                children: [
                  Text(
                    l10n.tr('how_was_experience'),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  StarRating(
                    rating: _rating,
                    size: 38,
                    onRatingChanged: (val) {
                      setState(() => _rating = val);
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Review text area
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.tr('write_review_optional'),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceWhite,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    border: Border.all(color: AppTheme.borderLight),
                  ),
                  child: TextField(
                    controller: _commentController,
                    maxLines: 4,
                    style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      hintText: l10n.tr('tell_experience_hint'),
                      hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 14),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Quick tags / chips
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _availableTags.map((tagKey) {
                    final isSelected = _selectedTags.contains(tagKey);
                    return FilterChip(
                      label: Text(l10n.tr(tagKey)),
                      selected: isSelected,
                      selectedColor: const Color(0xFFE0EDFF),
                      backgroundColor: AppTheme.surfaceWhite,
                      checkmarkColor: AppTheme.primaryBlue,
                      side: BorderSide(
                        color: isSelected ? AppTheme.primaryBlue : AppTheme.borderLight,
                      ),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? AppTheme.primaryBlue : AppTheme.textSecondary,
                      ),
                      onSelected: (selected) {
                        setState(() {
                          if (selected) {
                            _selectedTags.add(tagKey);
                          } else {
                            _selectedTags.remove(tagKey);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Submit Feedback Button
            AppButton(
              label: l10n.tr('submit_feedback'),
              suffixIcon: Icons.send_rounded,
              isLoading: bookingProvider.isLoading,
              onPressed: _handleSubmitFeedback,
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

