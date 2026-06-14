class Story {
  final String id;
  final String titleUz;
  final String titleRu;
  final String image;
  final String link;
  final String? audio;
  final String? video;
  final bool isActive;
  final int sortOrder;
  final String? groupKey;
  final String? groupTitleUz;
  final String? groupTitleRu;
  final String? ctaType; // 'none', 'product', 'category', 'brand'
  final List<String>? ctaIds;
  final String? ctaLabelUz;
  final String? ctaLabelRu;

  Story({
    required this.id,
    required this.titleUz,
    required this.titleRu,
    required this.image,
    required this.link,
    this.audio,
    this.video,
    required this.isActive,
    required this.sortOrder,
    this.groupKey,
    this.groupTitleUz,
    this.groupTitleRu,
    this.ctaType,
    this.ctaIds,
    this.ctaLabelUz,
    this.ctaLabelRu,
  });

  factory Story.fromJson(Map<String, dynamic> json) {
    return Story(
      id: json['id']?.toString() ?? '',
      titleUz: json['title_uz']?.toString() ?? '',
      titleRu: json['title_ru']?.toString() ?? '',
      image: json['image']?.toString() ?? '',
      link: json['link']?.toString() ?? '',
      audio: json['audio']?.toString(),
      video: json['video']?.toString(),
      isActive: json['is_active'] as bool? ?? true,
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
      groupKey: json['group_key']?.toString(),
      groupTitleUz: json['group_title_uz']?.toString(),
      groupTitleRu: json['group_title_ru']?.toString(),
      ctaType: json['cta_type']?.toString(),
      ctaIds: json['cta_ids'] != null ? List<String>.from(json['cta_ids']) : null,
      ctaLabelUz: json['cta_label_uz']?.toString(),
      ctaLabelRu: json['cta_label_ru']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title_uz': titleUz,
      'title_ru': titleRu,
      'image': image,
      'link': link,
      'audio': audio,
      'video': video,
      'is_active': isActive,
      'sort_order': sortOrder,
      'group_key': groupKey,
      'group_title_uz': groupTitleUz,
      'group_title_ru': groupTitleRu,
      'cta_type': ctaType,
      'cta_ids': ctaIds,
      'cta_label_uz': ctaLabelUz,
      'cta_label_ru': ctaLabelRu,
    };
  }

  String getLocalizedTitle(String lang) {
    if (lang == 'uz') return titleUz;
    if (lang == 'ru') return titleRu;
    return titleUz;
  }

  String? getLocalizedGroupTitle(String lang) {
    if (lang == 'uz') return groupTitleUz ?? titleUz;
    if (lang == 'ru') return groupTitleRu ?? titleRu;
    return groupTitleUz ?? titleUz;
  }

  String? getLocalizedCtaLabel(String lang) {
    if (lang == 'uz') return ctaLabelUz;
    if (lang == 'ru') return ctaLabelRu;
    return ctaLabelUz;
  }
}

class StoryGroup {
  final String key;
  final String coverImage;
  final bool coverIsVideo;
  final String titleUz;
  final String titleRu;
  final List<Story> slides;

  StoryGroup({
    required this.key,
    required this.coverImage,
    required this.coverIsVideo,
    required this.titleUz,
    required this.titleRu,
    required this.slides,
  });

  String getLocalizedTitle(String lang) {
    if (lang == 'uz') return titleUz;
    if (lang == 'ru') return titleRu;
    return titleUz;
  }
}
