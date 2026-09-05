import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'storage_service.dart';

class ApiException implements Exception {
  final String message;
  final String? code;
  final int statusCode;

  ApiException(this.message, {this.code, this.statusCode = 400});

  @override
  String toString() => message;
}

class ApiClient {
  static final http.Client _client = http.Client();

  static Future<Map<String, String>> _getHeaders({bool requiresAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requiresAuth) {
      final token = await StorageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  static dynamic _handleResponse(http.Response response, String url) {
    debugPrint('[API RES] ${response.statusCode} $url -> ${response.body}');

    dynamic jsonBody;
    try {
      jsonBody = jsonDecode(response.body);
    } catch (_) {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.body;
      }
      throw ApiException(
        'Server returned non-JSON response (${response.statusCode})',
        statusCode: response.statusCode,
      );
    }

    if (jsonBody is Map<String, dynamic>) {
      final bool isSuccess = jsonBody['success'] == true ||
          jsonBody['status'] == 'success' ||
          (jsonBody['error'] == null && response.statusCode >= 200 && response.statusCode < 300);

      if (isSuccess) {
        return jsonBody.containsKey('data') ? jsonBody['data'] : jsonBody;
      } else {
        final error = jsonBody['error'];
        final message = error is Map
            ? (error['message'] ?? error['code'] ?? 'An error occurred')
            : (jsonBody['message'] ?? 'Request failed (${response.statusCode})');
        final code = error is Map ? error['code']?.toString() : null;
        throw ApiException(message.toString(), code: code, statusCode: response.statusCode);
      }
    }

    return jsonBody;
  }

  static Future<dynamic> get(String url, {bool requiresAuth = true}) async {
    try {
      debugPrint('[API REQ] GET $url');
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final response = await _client.get(Uri.parse(url), headers: headers);
      return _handleResponse(response, url);
    } on ApiException catch (e) {
      debugPrint('[API ERR] GET $url -> ${e.message} (${e.statusCode})');
      rethrow;
    } catch (e) {
      debugPrint('[API NET ERR] GET $url -> $e');
      throw ApiException('Network connection failed ($url). Please check your backend connection.');
    }
  }

  static Future<dynamic> post(String url, {Map<String, dynamic>? body, bool requiresAuth = true}) async {
    try {
      debugPrint('[API REQ] POST $url -> $body');
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final response = await _client.post(
        Uri.parse(url),
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse(response, url);
    } on ApiException catch (e) {
      debugPrint('[API ERR] POST $url -> ${e.message} (${e.statusCode})');
      rethrow;
    } catch (e) {
      debugPrint('[API NET ERR] POST $url -> $e');
      throw ApiException('Network connection failed ($url). Please check your backend connection.');
    }
  }

  static Future<dynamic> patch(String url, {Map<String, dynamic>? body, bool requiresAuth = true}) async {
    try {
      debugPrint('[API REQ] PATCH $url -> $body');
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final response = await _client.patch(
        Uri.parse(url),
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse(response, url);
    } on ApiException catch (e) {
      debugPrint('[API ERR] PATCH $url -> ${e.message} (${e.statusCode})');
      rethrow;
    } catch (e) {
      debugPrint('[API NET ERR] PATCH $url -> $e');
      throw ApiException('Network connection failed ($url). Please check your backend connection.');
    }
  }

  static Future<dynamic> delete(String url, {bool requiresAuth = true}) async {
    try {
      debugPrint('[API REQ] DELETE $url');
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final response = await _client.delete(Uri.parse(url), headers: headers);
      return _handleResponse(response, url);
    } on ApiException catch (e) {
      debugPrint('[API ERR] DELETE $url -> ${e.message} (${e.statusCode})');
      rethrow;
    } catch (e) {
      debugPrint('[API NET ERR] DELETE $url -> $e');
      throw ApiException('Network connection failed ($url). Please check your backend connection.');
    }
  }
}
