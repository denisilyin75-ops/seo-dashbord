<?php
// mu-plugin: разрешает загрузку SVG в WP media library
// Безопасно для closed-circle admin-only сайта

add_filter('upload_mimes', function($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    $mimes['svgz'] = 'image/svg+xml';
    return $mimes;
});

add_filter('wp_check_filetype_and_ext', function($data, $file, $filename, $mimes, $real_mime = null) {
    if (!empty($data['type'])) return $data;
    $wp_file_type = wp_check_filetype($filename, $mimes);
    if ($wp_file_type['ext'] === 'svg') {
        return [
            'ext' => 'svg',
            'type' => 'image/svg+xml',
            'proper_filename' => $filename,
        ];
    }
    return $data;
}, 100, 5);

// Превью SVG в Media Library
add_filter('wp_prepare_attachment_for_js', function($response, $attachment) {
    if ($response['mime'] === 'image/svg+xml') {
        $response['sizes'] = array_merge(['thumbnail' => ['url' => $response['url']]], $response['sizes'] ?? []);
        $response['image'] = ['src' => $response['url']];
    }
    return $response;
}, 10, 2);
