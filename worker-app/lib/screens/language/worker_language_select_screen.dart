import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../l10n/worker_localizations.dart';
import '../../providers/worker_language_provider.dart';
import '../../services/worker_alert_tts_service.dart';

class WorkerLanguageSelectScreen extends StatefulWidget {
  final bool isFromSettings;

  const WorkerLanguageSelectScreen({
    super.key,
    this.isFromSettings = false,
  });

  @override
  State<WorkerLanguageSelectScreen> createState() => _WorkerLanguageSelectScreenState();
}

class _WorkerLanguageSelectScreenState extends State<WorkerLanguageSelectScreen> {
  String? _selectedCode;

  @override
  void initState() {
    super.initState();
    final langProvider = Provider.of<WorkerLanguageProvider>(context, listen: false);
    _selectedCode = langProvider.currentCode;
  }

  void _onLanguageSelected(String code) {
    setState(() {
      _selectedCode = code;
    });
    final langProvider = Provider.of<WorkerLanguageProvider>(context, listen: false);
    langProvider.setLanguage(code);
    WorkerAlertTtsService.setLanguage(code);
    WorkerAlertTtsService.warmUpUserGesture();
  }

  void _onConfirm() {
    final langProvider = Provider.of<WorkerLanguageProvider>(context, listen: false);
    if (_selectedCode != null) {
      langProvider.completeFirstLaunch(_selectedCode!);
      WorkerAlertTtsService.setLanguage(_selectedCode!);
    }

    if (widget.isFromSettings) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final langProvider = Provider.of<WorkerLanguageProvider>(context);
    final l10n = WorkerLocalizations.of(context);

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: widget.isFromSettings
          ? AppBar(
              title: Text(l10n.tr('language')),
              backgroundColor: Colors.white,
              elevation: 0,
              foregroundColor: AppTheme.textPrimary,
            )
          : null,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!widget.isFromSettings) ...[
                const SizedBox(height: 20),
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.translate_rounded,
                      size: 44,
                      color: AppTheme.primaryBlue,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
              Text(
                l10n.tr('choose_language'),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                  letterSpacing: -0.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                l10n.tr('select_language_subtitle'),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textMuted,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Language Cards List
              Expanded(
                child: ListView.separated(
                  physics: const BouncingScrollPhysics(),
                  itemCount: WorkerLanguageProvider.supportedLanguages.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final lang = WorkerLanguageProvider.supportedLanguages[index];
                    final isSelected = lang.code == (_selectedCode ?? langProvider.currentCode);

                    return InkWell(
                      onTap: () => _onLanguageSelected(lang.code),
                      borderRadius: BorderRadius.circular(16),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primaryBlue.withValues(alpha: 0.08) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected ? AppTheme.primaryBlue : AppTheme.borderLight,
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: AppTheme.primaryBlue.withValues(alpha: 0.15),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  )
                                ]
                              : [],
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? AppTheme.primaryBlue : Colors.grey.shade400,
                                  width: 2,
                                ),
                              ),
                              child: isSelected
                                  ? Center(
                                      child: Container(
                                        width: 12,
                                        height: 12,
                                        decoration: const BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: AppTheme.primaryBlue,
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    lang.nativeName,
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                      color: isSelected ? AppTheme.primaryBlue : AppTheme.textPrimary,
                                    ),
                                  ),
                                  if (lang.englishName != lang.nativeName) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      lang.englishName,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: isSelected
                                            ? AppTheme.primaryBlue.withValues(alpha: 0.8)
                                            : AppTheme.textMuted,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            if (isSelected)
                              const Icon(
                                Icons.check_circle_rounded,
                                color: AppTheme.primaryBlue,
                                size: 22,
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _onConfirm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 2,
                ),
                child: Text(
                  l10n.tr('continue_btn'),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
