import 'package:flutter/material.dart';
import '../config/theme.dart';

class StarRating extends StatelessWidget {
  final int rating;
  final int maxRating;
  final double size;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<int>? onRatingChanged;

  const StarRating({
    super.key,
    required this.rating,
    this.maxRating = 5,
    this.size = 24.0,
    this.activeColor = AppTheme.ratingYellow,
    this.inactiveColor = const Color(0xFFCBD5E1),
    this.onRatingChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(maxRating, (index) {
        final starIndex = index + 1;
        final isFilled = starIndex <= rating;
        return GestureDetector(
          onTap: onRatingChanged != null ? () => onRatingChanged!(starIndex) : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4.0),
            child: Icon(
              isFilled ? Icons.star_rounded : Icons.star_rounded,
              color: isFilled ? activeColor : inactiveColor,
              size: size,
            ),
          ),
        );
      }),
    );
  }
}
