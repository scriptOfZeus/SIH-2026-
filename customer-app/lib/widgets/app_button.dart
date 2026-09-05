import 'package:flutter/material.dart';
import '../config/theme.dart';

enum ButtonVariant { primary, outlined, danger, soft }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final bool isLoading;
  final IconData? icon;
  final IconData? suffixIcon;
  final double? width;
  final double height;
  final double borderRadius;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.isLoading = false,
    this.icon,
    this.suffixIcon,
    this.width = double.infinity,
    this.height = 52.0,
    this.borderRadius = AppTheme.radiusMedium,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    BorderSide? border;

    switch (variant) {
      case ButtonVariant.primary:
        bgColor = AppTheme.primaryBlue;
        textColor = Colors.white;
        border = BorderSide.none;
        break;
      case ButtonVariant.outlined:
        bgColor = Colors.transparent;
        textColor = AppTheme.primaryBlue;
        border = const BorderSide(color: AppTheme.primaryBlue, width: 1.5);
        break;
      case ButtonVariant.danger:
        bgColor = AppTheme.dangerRedBg;
        textColor = AppTheme.dangerRed;
        border = BorderSide.none;
        break;
      case ButtonVariant.soft:
        bgColor = AppTheme.lightBlueBg;
        textColor = AppTheme.primaryBlue;
        border = BorderSide.none;
        break;
    }

    final effectiveOnPressed = isLoading ? null : onPressed;

    return SizedBox(
      width: width,
      height: height,
      child: Material(
        color: bgColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          side: border,
        ),
        elevation: variant == ButtonVariant.primary && !isLoading ? 2 : 0,
        shadowColor: AppTheme.primaryBlue.withOpacity(0.3),
        child: InkWell(
          onTap: effectiveOnPressed,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Center(
            child: isLoading
                ? SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        variant == ButtonVariant.outlined ? AppTheme.primaryBlue : Colors.white,
                      ),
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[
                          Icon(icon, size: 18, color: textColor),
                          const SizedBox(width: 8),
                        ],
                        Flexible(
                          child: Text(
                            label,
                            style: TextStyle(
                              color: textColor,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                        if (suffixIcon != null) ...[
                          const SizedBox(width: 8),
                          Icon(suffixIcon, size: 18, color: textColor),
                        ],
                      ],
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
