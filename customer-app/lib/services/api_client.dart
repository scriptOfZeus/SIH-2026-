import 'dart:convert';
import 'dart:io';
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

  static dynamic _handleResponse(http.Response response) {
    dynamic jsonBody;
    try {
      jsonBody = jsonDecode(response.body);
    } catch (_) {
      throw ApiException(
        'Server returned invalid response (${response.statusCode})',
        statusCode: response.statusCode,
      );
    }

    if (jsonBody is Map<String, dynamic>) {
      final bool isSuccess = jsonBody['success'] == true;
      if (isSuccess) {
        return jsonBody['data'];
      } else {
        final error = jsonBody['error'];
        final message = error is Map ? (error['message'] ?? 'An error occurred') : 'Request failed';
        final code = error is Map ? error['code'] : null;
        throw ApiException(message.toString(), code: code?.toString(), statusCode: response.statusCode);
      }
    }

    return jsonBody;
  }

  static Future<dynamic> get(String url, {bool requiresAuth = true}) async {
    try {
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final response = await _client.get(Uri.parse(url), headers: headers);
      return _handleResponse(response);
    } on SocketException {
      throw ApiException('Network connection failed. Please check your internet connection.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(e.toString());
    }
  }

  static Future<dynamic> post(String url, {Map<String, dynamic>? body, bool requiresAuth = true}) async {
    try {
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final response = await _client.post(
        Uri.parse(url),
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse(response);
    } on SocketException {
      throw ApiException('Network connection failed. Please check your internet connection.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(e.toString());
    }
  }

  static Future<dynamic> patch(String url, {Map<String, dynamic>? body, bool requiresAuth = true}) async {
    try {
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final response = await _client.patch(
        Uri.parse(url),
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse(response);
    } on SocketException {
      throw ApiException('Network connection failed. Please check your internet connection.');
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(e.toString());
    }
  }
}
