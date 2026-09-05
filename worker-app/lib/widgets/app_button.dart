import 'package:flutter/material.dart';
import '../config/theme.dart';

enum ButtonType { primary, outlined, emergency, danger, text }

class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonType type;
  final bool isLoading;
  final IconData? icon;
  final IconData? suffixIcon;
  final double? width;
  final double height;

  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.type = ButtonType.primary,
    this.isLoading = false,
    this.icon,
    this.suffixIcon,
    this.width,
    this.height = 50,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color fgColor;
    BorderSide borderSide = BorderSide.none;

    switch (type) {
      case ButtonType.primary:
        bgColor = AppTheme.primaryBlue;
        fgColor = Colors.white;
        break;
      case ButtonType.outlined:
        bgColor = Colors.white;
        fgColor = AppTheme.primaryBlue;
        borderSide = const BorderSide(color: AppTheme.primaryBlue, width: 1.5);
        break;
      case ButtonType.emergency:
        bgColor = AppTheme.emergencyOrange;
        fgColor = Colors.white;
        break;
      case ButtonType.danger:
        bgColor = AppTheme.dangerLightBg;
        fgColor = AppTheme.dangerRed;
        borderSide = const BorderSide(color: AppTheme.dangerRed, width: 1);
        break;
      case ButtonType.text:
        bgColor = Colors.transparent;
        fgColor = AppTheme.primaryBlue;
        break;
    }

    final bool isDisabled = onPressed == null || isLoading;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: isDisabled ? null : onPressed,
      child: SizedBox(
        width: width ?? double.infinity,
        height: height,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
          backgroundColor: isDisabled
              ? (type == ButtonType.outlined ? Colors.white : Colors.grey.shade300)
              : bgColor,
          foregroundColor: isDisabled ? Colors.grey.shade500 : fgColor,
          elevation: (isDisabled || type == ButtonType.outlined || type == ButtonType.text) ? 0 : 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
            side: isDisabled && type == ButtonType.outlined
                ? BorderSide(color: Colors.grey.shade300)
                : borderSide,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        onPressed: isDisabled ? null : onPressed,
        child: isLoading
            ? SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: type == ButtonType.outlined ? AppTheme.primaryBlue : Colors.white,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: isDisabled ? Colors.grey.shade500 : fgColor),
                    const SizedBox(width: 8),
                  ],
                  Flexible(
                    child: Text(
                      text,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isDisabled ? Colors.grey.shade500 : fgColor,
                      ),
                    ),
                  ),
                  if (suffixIcon != null) ...[
                    const SizedBox(width: 8),
                    Icon(suffixIcon, size: 18, color: isDisabled ? Colors.grey.shade500 : fgColor),
                  ],
                ],
              ),
        ),
      ),
    );
  }
}
