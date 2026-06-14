import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide MultipartFile;
import '../../../core/l10n/localization.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/supabase/supabase_client.dart';
import '../../auth/providers/auth_provider.dart';

class SupportChatScreen extends ConsumerStatefulWidget {
  const SupportChatScreen({super.key});

  @override
  ConsumerState<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends ConsumerState<SupportChatScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  File? _selectedImage;
  bool _isUploading = false;
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _fetchHistoryAndSubscribe();
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    if (_realtimeChannel != null) {
      ref.read(supabaseClientProvider).removeChannel(_realtimeChannel!);
    }
    super.dispose();
  }

  Future<void> _fetchHistoryAndSubscribe() async {
    final user = ref.read(authProvider);
    if (user == null) {
      setState(() => _isLoading = false);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.get('/api/chat', queryParameters: {
        'chat_id': user.phone,
      });

      final data = response.data;
      if (data != null && data['success'] == true) {
        final List rawMsgs = data['messages'] ?? [];
        setState(() {
          _messages.clear();
          for (final m in rawMsgs) {
            _messages.add({
              'id': m['id']?.toString() ?? '',
              'text': m['text']?.toString() ?? '',
              'image': m['image']?.toString(),
              'video': m['video']?.toString(),
              'senderId': m['sender_id']?.toString() ?? '',
              'senderType': m['sender_type']?.toString() ?? '',
              'timestamp': m['created_at'] != null ? DateTime.parse(m['created_at']) : DateTime.now(),
            });
          }
        });
        _scrollToBottom();
      }

      // Supabase realtime channel subscription
      final supabase = ref.read(supabaseClientProvider);
      _realtimeChannel = supabase
          .channel('public:support_messages')
          .onPostgresChanges(
            event: PostgresChangeEvent.insert,
            schema: 'public',
            table: 'support_messages',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'chat_id',
              value: user.phone,
            ),
            callback: (payload) {
              final m = payload.newRecord;
              final newMsg = {
                'id': m['id']?.toString() ?? '',
                'text': m['text']?.toString() ?? '',
                'image': m['image']?.toString(),
                'video': m['video']?.toString(),
                'senderId': m['sender_id']?.toString() ?? '',
                'senderType': m['sender_type']?.toString() ?? '',
                'timestamp': m['created_at'] != null ? DateTime.parse(m['created_at']) : DateTime.now(),
              };

              // Prevent double inserts from local optimization
              final exists = _messages.any((x) => x['id'] == newMsg['id']);
              if (!exists) {
                setState(() {
                  _messages.add(newMsg);
                });
                _scrollToBottom();
              }
            },
          );
      _realtimeChannel!.subscribe();
    } catch (e) {
      debugPrint("Error fetching chat: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }

  Future<String?> _uploadImage(File file) async {
    setState(() => _isUploading = true);
    try {
      final apiClient = ref.read(apiClientProvider);
      final filename = file.path.split('/').last;

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: filename),
        'fileName': filename,
      });

      final response = await apiClient.dio.post(
        '/api/upload',
        data: formData,
      );

      if (response.statusCode == 200 && response.data != null) {
        return response.data['url']?.toString();
      }
    } catch (e) {
      debugPrint("Error uploading file to Yandex S3: $e");
    } finally {
      setState(() => _isUploading = false);
    }
    return null;
  }

  Future<void> _sendMessage() async {
    final user = ref.read(authProvider);
    final text = _textController.text.trim();

    if (user == null || (text.isEmpty && _selectedImage == null)) return;

    setState(() => _isSending = true);

    try {
      String? imageUrl;
      if (_selectedImage != null) {
        imageUrl = await _uploadImage(_selectedImage!);
        if (imageUrl == null) {
          ApiClient.showToast(ref.watch(localeProvider) == 'ru' ? "Ошибка загрузки фото" : "Rasm yuklashda xatolik yuz berdi", isError: true);
          setState(() => _isSending = false);
          return;
        }
      }

      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.dio.post(
        '/api/chat',
        data: {
          'chat_id': user.phone,
          'text': text,
          'image': imageUrl,
          'video': null,
          'sender_id': user.phone,
          'sender_type': 'user',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _textController.clear();
        setState(() {
          _selectedImage = null;
        });
        _scrollToBottom();
      }
    } catch (e) {
      debugPrint("Error sending message: $e");
    } finally {
      setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);
    final lang = ref.watch(localeProvider);

    if (user == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(context.tr('common.supportService', ref)),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                lang == 'ru' ? 'Пожалуйста, войдите в систему' : 'Iltimos, tizimga kiring',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.push('/login'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
                child: Text(lang == 'ru' ? 'Войти' : 'Kirish', style: const TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF6),
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: const Color(0xFFFAFAF6),
        elevation: 0.5,
        foregroundColor: AppTheme.textPrimaryColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF3EC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.headset_mic, color: AppTheme.primaryColor, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  context.tr('common.supportService', ref),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: AppTheme.primaryColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'Online',
                      style: TextStyle(fontSize: 10, color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Messages Area
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                  : _messages.isEmpty
                      ? _buildEmptyChat()
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            final isMe = msg['senderId'] == user.phone;
                            return _buildMessageBubble(msg, isMe);
                          },
                        ),
            ),

            // Preview attachment
            if (_selectedImage != null) _buildImagePreview(),

            // Chat input bar
            _buildInputBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyChat() {
    final lang = ref.watch(localeProvider);
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF3EC),
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Icon(Icons.headset_mic, color: AppTheme.primaryColor, size: 36),
            ),
            const SizedBox(height: 20),
            Text(
              lang == 'ru' ? 'Чем мы можем помочь?' : 'Qanday yordam bera olamiz?',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimaryColor),
            ),
            const SizedBox(height: 8),
            Text(
              lang == 'ru'
                  ? 'Напишите здесь ваши вопросы или проблемы.'
                  : 'Savol va murojaatlaringizni shu yerda yozib qoldiring.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondaryColor),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, bool isMe) {
    final String? text = msg['text'];
    final String? imageUrl = msg['image'];
    final DateTime timestamp = msg['timestamp'] as DateTime;
    final timeStr = "${timestamp.hour.toString().padLeft(2, '0')}:${timestamp.minute.toString().padLeft(2, '0')}";

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF3EC),
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.headset_mic, color: AppTheme.primaryColor, size: 14),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              decoration: BoxDecoration(
                gradient: isMe
                    ? const LinearGradient(
                        colors: [AppTheme.primaryColor, Color(0xFF1F5A30)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                color: isMe ? null : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
                  bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 5,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (imageUrl != null)
                    GestureDetector(
                      onTap: () {
                        // Open full screen image
                      },
                      child: Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Container(
                            width: 200,
                            height: 150,
                            color: Colors.grey.shade100,
                            alignment: Alignment.center,
                            child: const CircularProgressIndicator(color: AppTheme.primaryColor),
                          );
                        },
                      ),
                    ),
                  if (text != null && text.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Text(
                        text,
                        style: TextStyle(
                          color: isMe ? Colors.white : AppTheme.textPrimaryColor,
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 0, 10, 8),
                    child: Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: 9,
                        color: isMe ? Colors.white.withOpacity(0.6) : Colors.grey,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.white,
      child: Row(
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(_selectedImage!, width: 80, height: 80, fit: BoxFit.cover),
              ),
              if (_isUploading)
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                ),
              Positioned(
                top: -6,
                right: -6,
                child: IconButton(
                  icon: const Icon(Icons.cancel, color: Colors.red),
                  onPressed: () {
                    setState(() {
                      _selectedImage = null;
                    });
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    final lang = ref.watch(localeProvider);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.black.withOpacity(0.04))),
      ),
      child: Row(
        children: [
          // Attachment clip button
          IconButton(
            icon: const Icon(Icons.attach_file, color: AppTheme.primaryColor),
            onPressed: _pickImage,
          ),
          Expanded(
            child: TextField(
              controller: _textController,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              maxLines: null,
              decoration: InputDecoration(
                hintText: lang == 'ru' ? 'Напишите сообщение...' : 'Xabaringizni yozing...',
                hintStyle: TextStyle(color: Colors.grey.shade400),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Send button
          GestureDetector(
            onTap: _isSending ? null : _sendMessage,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                color: AppTheme.primaryColor,
                shape: BoxShape.circle,
              ),
              child: _isSending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.send, color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}
