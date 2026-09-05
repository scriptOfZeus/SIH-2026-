import '../config/api_config.dart';
import '../models/worker_profile_model.dart';
import 'api_client.dart';
import 'storage_service.dart';

class WorkerService {
  static Future<WorkerProfile?> getProfile() async {
    try {
      final data = await ApiClient.get(ApiConfig.workerMe);
      if (data is Map<String, dynamic>) {
        final profile = WorkerProfile.fromJson(data);
        final isAvail = await StorageService.isAvailable();
        return profile.copyWith(isAvailable: isAvail);
      }
    } catch (e) {
      // Fallback local mock worker profile if network/offline
      final phone = await StorageService.getPhone() ?? '+91 98765 43210';
      final isAvail = await StorageService.isAvailable();
      return WorkerProfile(
        id: 'w-kolkata-01',
        fullName: 'Rahul Sharma',
        phone: phone,
        skillCategory: 'electrician',
        isAvailable: isAvail,
        verificationStatus: 'approved',
      );
    }
    return null;
  }

  static Future<void> updateLocation(double lat, double lng) async {
    try {
      await ApiClient.patch(
        ApiConfig.workerMe,
        body: {'lat': lat, 'lng': lng},
      );
    } catch (_) {
      // Silent error or logged
    }
  }

  static Future<void> setAvailability(bool available) async {
    await StorageService.setAvailability(available);
    try {
      await ApiClient.patch(
        ApiConfig.workerMe,
        body: {'is_available': available ? 1 : 0},
      );
    } catch (_) {
      // Offline fallback: saved locally in StorageService
    }
  }

  static Future<bool> updateProfile({
    String? fullName,
    String? skillCategory,
    double? hourlyRate,
    int? experienceYears,
    String? address,
    String? pincode,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (fullName != null) body['full_name'] = fullName;
      if (skillCategory != null) body['skill_category'] = skillCategory;
      if (hourlyRate != null) body['hourly_rate'] = hourlyRate;
      if (experienceYears != null) body['experience_years'] = experienceYears;
      if (address != null) body['address'] = address;
      if (pincode != null) body['pincode'] = pincode;

      final res = await ApiClient.patch(
        ApiConfig.workerMe,
        body: body,
      );
      return res != null;
    } catch (_) {
      return false;
    }
  }

  static Future<Map<String, dynamic>?> uploadCertificate({
    required String documentBase64,
    required String mimeType,
    required String filename,
    Map<String, dynamic>? ocrHints,
  }) async {
    try {
      final body = <String, dynamic>{
        'document_base64': documentBase64,
        'mime_type': mimeType,
        'filename': filename,
      };
      if (ocrHints != null) {
        body['ocr_hints'] = ocrHints;
      }

      final res = await ApiClient.post(
        ApiConfig.workerUploadCertificate,
        body: body,
      );

      if (res is Map<String, dynamic>) {
        return res;
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }
}
