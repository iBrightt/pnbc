<?php
date_default_timezone_set('Asia/Manila'); 
$girlfriendName = 'Love'; 
$birthdayDate = '2025-11-13';  

// include centralized classes
require_once __DIR__ . '/assets/class/classes.php';

$messagesFile = __DIR__ . '/controller/messages.json';
$store = new MessageStore($messagesFile);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guest_name'], $_POST['guest_message'])) {
    $store->add($_POST['guest_name'], $_POST['guest_message']);
    // Redirect to avoid duplicate submission
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

// Load messages for display
$messages = $store->load();

// Load personal messages from a separate file for maintainability
require_once __DIR__ . '/controller/personal_messages.php';

// fallback if included file did not define the variable
if (!isset($personalMessages) || !is_array($personalMessages)) {
    $personalMessages = [];
}

$hasSong = file_exists(__DIR__ . '/song.mp3') || file_exists(__DIR__ . '/assets/sound/song.mp3');

// detect up to 3 audio files inside assets/sound (preferred), otherwise fallback to root song1/2/3
$playlist = [];
$soundDir = __DIR__ . '/assets/sound';
$imgExts = ['png','jpg','jpeg','webp','gif'];

$probeCover = function(string $baseName) use ($imgExts) {
	// try candidate locations relative to project
	$candidates = [];
	foreach ($imgExts as $ext) {
		$candidates[] = 'assets/sound/' . $baseName . '.' . $ext;
		$candidates[] = 'assets/img/' . $baseName . '.' . $ext;
		$candidates[] = 'assets/media/' . $baseName . '.' . $ext;
		$candidates[] = '_next/' . $baseName . '.' . $ext;
		$candidates[] = 'assets/coverphoto/' . $baseName . '.' . $ext; // check coverphoto folder
		$candidates[] = $baseName . '.' . $ext; // root
	}
	foreach ($candidates as $c) {
		if (file_exists(__DIR__ . '/' . ltrim($c, '/'))) return $c;
	}
	return ''; // no cover found
};

if (is_dir($soundDir)) {
    $files = array_values(array_filter(scandir($soundDir), function($f){
        return preg_match('/\.(mp3|m4a|ogg|wav)$/i', $f);
    }));
    sort($files, SORT_NATURAL | SORT_FLAG_CASE);
    foreach (array_slice($files, 0, 3) as $f) {
        $rel = 'assets/sound/' . $f; // relative path for the browser
        $base = pathinfo($f, PATHINFO_FILENAME);

        // try to extract "artist" and "title" from filename when formatted like "Artist - Title"
        $title = $base;
        $artist = '';
        $delims = [' - ', '—', '–', '_'];
        foreach ($delims as $d) {
            if (strpos($base, $d) !== false) {
                $parts = explode($d, $base, 2);
                // assume first part is artist, second is title
                $artist = trim($parts[0]);
                $title = trim($parts[1]);
                break;
            }
        }

        $cover = $probeCover($base); // try to find image with same base name
        $playlist[] = ['file' => $rel, 'title' => $title, 'artist' => $artist, 'cover' => $cover];
    }
} else {
    $potentialSongs = ['song1.mp3', 'song2.mp3', 'song3.mp3'];
    foreach ($potentialSongs as $s) {
        if (file_exists(__DIR__ . '/' . $s)) {
            $base = pathinfo($s, PATHINFO_FILENAME);

            // parse artist/title similarly for root files
            $title = $base;
            $artist = '';
            $delims = [' - ', '—', '–', '_'];
            foreach ($delims as $d) {
                if (strpos($base, $d) !== false) {
                    $parts = explode($d, $base, 2);
                    $artist = trim($parts[0]);
                    $title = trim($parts[1]);
                    break;
                }
            }

            $cover = $probeCover($base);
            $playlist[] = ['file' => $s, 'title' => $title, 'artist' => $artist, 'cover' => $cover];
        }
    }
}
 
$bdParts = explode('-', $birthdayDate);
$targetTs = false;
if (count($bdParts) >= 3) {
	$bm = $bdParts[1];
	$bd = $bdParts[2];
	$nowTs = time();
	$thisYear = (int)date('Y', $nowTs);

	// helper: find the first year >= $startYear that produces a valid timestamp for month/day
	$findValidTs = function(int $startYear) use ($bm, $bd) {
		$maxTry = 5; // safeguard (covers leap-year cycles)
		$year = $startYear;
		for ($i = 0; $i < $maxTry; $i++, $year++) {
			$ts = @strtotime(sprintf('%04d-%02d-%02d 00:00:00', $year, $bm, $bd));
			if ($ts !== false) return $ts;
		}
		return false;
	};

	$thisYearBirthdayTs = $findValidTs($thisYear);

	if ($thisYearBirthdayTs === false) {
		// fallback to parsing the original full date
		$targetTs = @strtotime($birthdayDate . ' 00:00:00');
	} else {
		if ($nowTs < $thisYearBirthdayTs) {
			// upcoming this year
			$targetTs = $thisYearBirthdayTs;
		} elseif ($nowTs < ($thisYearBirthdayTs + 86400)) {
			// currently the birthday day: keep target at this year's midnight so client displays 0 00 00 00
			$targetTs = $thisYearBirthdayTs;
		} else {
			// birthday already passed for this year -> pick next valid year
			$targetTs = $findValidTs($thisYear + 1);
			// if still false, fallback to original parse
			if ($targetTs === false) $targetTs = @strtotime($birthdayDate . ' 00:00:00');
		}
	}
} else {
	// invalid format: fallback
	$targetTs = @strtotime($birthdayDate . ' 00:00:00');
}

$targetMs = ($targetTs === false) ? 0 : ($targetTs * 1000);

// derive a month-day string for client-side rollover (MM-DD)
$bd_md = '';
if ($targetTs !== false) {
	$bd_md = date('m-d', $targetTs);
} else {
	$parts = explode('-', $birthdayDate);
	if (count($parts) >= 3) {
		$bd_md = sprintf('%02d-%02d', intval($parts[1]), intval($parts[2]));
	} elseif (count($parts) >= 2) {
		$bd_md = sprintf('%02d-%02d', intval($parts[0]), intval($parts[1]));
	}
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Happy Birthday <?= htmlspecialchars($girlfriendName) ?></title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
<link rel="stylesheet" href="assets/front/style.css">
<link rel="stylesheet" href="assets/front/responsive.css">

</head>
<body>
<canvas id="confetti"></canvas>
<div class="wrap">
  <div class="hero">
    <div class="left-col">
      <div class="photo">
        <?php
          // prefer special image _next/kukupay.png if present, otherwise use photo.jpg
          $specialPath = __DIR__ . '/_next/7F1E9C62-4F49-4AF4-8E5B-437AC81A7678.png';
          if (file_exists($specialPath)) {
              $photoRel = '_next/7F1E9C62-4F49-4AF4-8E5B-437AC81A7678.png';
              $photoFound = true;
          } elseif (file_exists(__DIR__ . '/photo.jpg')) {
              $photoRel = 'photo.jpg';
              $photoFound = true;
          } else {
              $photoRel = '';
              $photoFound = false;
          }

          // Add the user-provided alternate image filename as a candidate
          $altFilename = '_next/9E391A4C-9096-47F4-B421-B51E2CC5D967.png';
          $altPhotoRel = '';
          if (file_exists(__DIR__ . '/' . $altFilename)) {
              $altPhotoRel = $altFilename;
          } else {
              // fallback to other common alternate names if present
              if (file_exists(__DIR__ . '/photo2.jpg')) $altPhotoRel = 'photo2.jpg';
              elseif (file_exists(__DIR__ . '/photo_alt.jpg')) $altPhotoRel = 'photo_alt.jpg';
              elseif (file_exists(__DIR__ . '/_next/7F1E9C62-4F49-4AF4-8E5B-437AC81A7678.png')) $altPhotoRel = '_next/7F1E9C62-4F49-4AF4-8E5B-437AC81A7678.png';
          }

          // Look for a hover/rollover image (used when cursor is over the photo)
          $hoverCandidates = [
            '_next/D1121D42-3A94-4B63-A751-E45F4836B842.png', // your provided name (in _next)
            'D1121D42-3A94-4B63-A751-E45F4836B842.png',
            'photo_hover.jpg',
            'hover.jpg'
          ];
          $hoverPhotoRel = '';
          foreach ($hoverCandidates as $cand) {
              if (file_exists(__DIR__ . '/' . $cand)) { $hoverPhotoRel = $cand; break; }
          }
        ?>
        <?php if ($photoFound): ?>
          <img id="hero-photo"
               src="<?= htmlspecialchars($photoRel) ?>"
               data-alt="<?= htmlspecialchars($altPhotoRel) ?>"
               data-original="<?= htmlspecialchars($photoRel) ?>"
               data-hover="<?= htmlspecialchars($hoverPhotoRel) ?>"
               alt="Photo">
        <?php else: ?>
          <div class="text-center text-muted p-3"></div>
        <?php endif; ?>
      </div>

      <!-- Playlist UI: shows up to 3 tracks; empty/placeholder if files missing -->
      <div id="playlist-box" class="messagescontainer left playlist-box" aria-label="Playlist">
        <div class="messages-header">
          <div class="messages-title">
            <i class="bi bi-music-note-beamed me-4 icon-spacing"></i>
            <strong>Playlist</strong>
          </div>
        </div>
        <div class="playlist" id="playlist">
          <?php if (count($playlist) === 0): ?>
            <div class="playlist-empty">Place song1.mp3, song2.mp3, song3.mp3 in the site root to enable the playlist.</div>
            <!-- show placeholders so layout is predictable -->
            <div class="track placeholder">Simula pa nung una</div>
            <div class="track placeholder">Can I have this dance</div>
            <div class="track placeholder">We fell inlove in october</div>
          <?php else: ?>
            <?php foreach ($playlist as $idx => $t): ?>
              <div class="track<?= $idx === 0 ? ' active' : '' ?>" data-src="<?= htmlspecialchars($t['file']) ?>" role="button" tabindex="0" aria-label="<?= htmlspecialchars($t['title']) ?>">
                <div class="track-cover">
                  <?php if (!empty($t['cover'])): ?>
                    <img src="<?= htmlspecialchars($t['cover']) ?>" alt="<?= htmlspecialchars($t['title']) ?> cover">
                  <?php else: ?>
                    <!-- placeholder when no cover found -->
                    <div class="track-cover-placeholder" aria-hidden="true"></div>
                  <?php endif; ?>
                </div>
                <div class="track-meta">
                  <div class="track-title"><span class="marquee"><?= htmlspecialchars($t['title']) ?></span></div>
                  <?php if (!empty($t['artist'])): ?>
                    <div class="track-artist"><?= htmlspecialchars($t['artist']) ?></div>
                  <?php endif; ?>
                  <!-- filename hidden from visual UI for privacy; data-src still present for playback -->
                </div>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>

        <div class="playlist-controls">
          <!-- Player UI: progress + large central controls -->
          <div class="player-ui" aria-label="Audio player">
            <div class="progress-row">
              <div id="time-current" class="time">00:00</div>
              <input id="progress" type="range" min="0" max="100" value="0" aria-label="Playback position">
              <div id="time-remaining" class="time">-00:00</div>
            </div>
            <div class="center-controls">
              <button type="button" id="prev-btn" class="icon-btn" aria-label="Previous track">
                <i class="bi bi-skip-start-fill" aria-hidden="true"></i>
              </button>
              <button type="button" id="play-btn" class="play-toggle" aria-label="Play/Pause" aria-pressed="false">
                <i class="bi bi-play-fill" aria-hidden="true"></i>
              </button>
              <button type="button" id="next-btn" class="icon-btn" aria-label="Next track">
                <i class="bi bi-skip-end-fill" aria-hidden="true"></i>
              </button>
            </div>
          </div>
         </div>
 
         <!-- hidden audio player used by the playlist controller -->
         <audio id="player" preload="auto" style="display:none">
           <source id="player-source" src="" type="audio/mpeg">
         </audio>
       </div>
    </div>

    <div class="info">
      <div class="title-row">
        <h1>Happy Birthday, <?= htmlspecialchars($girlfriendName) ?>!</h1>
        <!-- theme toggle placed to the right of the title -->
        <button id="themeToggle" class="theme-toggle" aria-label="Toggle color theme" aria-pressed="false" title="Toggle theme" type="button">
          <span class="knob" aria-hidden="true">
            <i class="bi bi-sun-fill" aria-hidden="true"></i>
            <i class="bi bi-moon-fill" aria-hidden="true"></i>
          </span>
        </button>
      </div>
      <p class="lead">
		  Hope your birthday is full of love, joy, and everything that makes you happy.
	    </p>

      <div><strong>Date:</strong> <span id="display-date"><?= $targetTs ? date('F j, Y', $targetTs) : htmlspecialchars($birthdayDate) ?></span></div>

      <!-- Replace single countdown block with a flex row that includes the cake on the right -->
      <div class="count-cake-row mt-2">
        <div id="countdown" class="countdown" aria-live="polite">
          <div><div class="num" id="cd-days">--</div><div class="muted">Days</div></div>
          <div><div class="num" id="cd-hours">--</div><div class="muted">Hours</div></div>
          <div><div class="num" id="cd-mins">--</div><div class="muted">Mins</div></div>
          <div><div class="num" id="cd-secs">--</div><div class="muted">Secs</div></div>
        </div>

        <div id="cake-btn" class="cake-wrap" role="button" tabindex="0" aria-label="Birthday cake with candle" aria-pressed="true" data-flame="1">
          <!-- simple accessible inline SVG cake + candle -->
          <svg class="cake-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <!-- candle flame (animated via CSS .flame) -->
            <g transform="translate(0,0)">
              <path class="flame" d="M60 10 C64 16 62 24 60 31 C58 24 56 16 60 10 Z" fill="#FFB74D"/>
              <path d="M60 13 C62 17 61.2 21 60 25 C58.8 21 57.8 17 60 13 Z" fill="#FFE082" opacity="0.9"/>
            </g>

            <!-- candle -->
            <rect x="56" y="32" width="8" height="22" rx="1.5" fill="#fff"/>
            <rect x="56" y="34" width="8" height="4" rx="1" fill="#ffd1a9" opacity="0.6"/>
            <rect x="56" y="40" width="8" height="4" rx="1" fill="#ffd1a9" opacity="0.35"/>

            <!-- top frosting -->
            <rect x="15" y="48" width="90" height="14" rx="6" fill="#fff6f7"/>
            <!-- middle layer -->
            <rect x="12" y="60" width="96" height="18" rx="6" fill="#ff9fb3"/>
            <!-- bottom base -->
            <rect x="8" y="78" width="104" height="18" rx="6" fill="#8b5e4b"/>
            <!-- sprinkles (decor) -->
            <circle cx="30" cy="64" r="1.8" fill="#ffd166"/>
            <circle cx="46" cy="70" r="1.8" fill="#7ee3b7"/>
            <circle cx="64" cy="62" r="1.8" fill="#7cc0ff"/>
            <circle cx="86" cy="68" r="1.8" fill="#d6a8ff"/>
          </svg>
          <!-- smoke container filled by JS when candle is extinguished -->
          <div class="cake-smoke" aria-hidden="true"></div>
        </div>
      </div>

      <!--  
      <div class="controls">
        <?php if ($hasSong): ?>
          <audio id="song" src="song.mp3" preload="auto"></audio>
          <button type="button" id="song-btn">Play Song</button>
        <?php else: ?>
          <div class="text-muted">Add song.mp3 to enable a play button</div>
        <?php endif; ?>
        <button type="button" id="confetti-btn">Celebrate!</button>
      </div>
      -->
      <!--
      <div class="form">
        <form method="post" action="">
          <input type="text" name="guest_name" placeholder="Title" maxlength="60" />
          <div class="h-2"></div>
          <textarea name="guest_message" placeholder="Write a short message..." rows="3" maxlength="500"></textarea>
          <div class="h-2"></div>
          <input type="submit" value="Send message">
        </form>
      </div>
        -->

      <!-- mobile-only playlist (visible on small screens, placed above the timeline) -->
      <?php if (count($playlist) === 0): ?>
      <div id="playlist-box-mobile" class="messagescontainer left playlist-box playlist-mobile" aria-label="Playlist (mobile)">
        <div class="messages-header">
          <div class="messages-title">
            <i class="bi bi-music-note-beamed me-4 icon-spacing"></i>
            <strong>Playlist</strong>
          </div>
        </div>
        <div class="playlist" id="playlist-mobile-list">
          <div class="playlist-empty">Place song1.mp3, song2.mp3, song3.mp3 in the site root to enable the playlist.</div>
          <div class="track placeholder">Simula pa nung una</div>
          <div class="track placeholder">Can I have this dance</div>
          <div class="track placeholder">We fell inlove in october</div>
        </div>
      </div>
      <?php else: ?>
      <div id="playlist-box-mobile" class="messagescontainer left playlist-box playlist-mobile" aria-label="Playlist (mobile)">
        <div class="messages-header">
          <div class="messages-title">
            <i class="bi bi-music-note-beamed me-4 icon-spacing"></i>
            <strong>Playlist</strong>
          </div>
        </div>
        <div class="playlist" id="playlist-mobile-list">
          <?php foreach ($playlist as $idx => $t): ?>
            <div class="track<?= $idx === 0 ? ' active' : '' ?>" data-src="<?= htmlspecialchars($t['file']) ?>" role="button" tabindex="0" aria-label="<?= htmlspecialchars($t['title']) ?>">
              <div class="track-cover">
                <?php if (!empty($t['cover'])): ?>
                  <img src="<?= htmlspecialchars($t['cover']) ?>" alt="<?= htmlspecialchars($t['title']) ?> cover">
                <?php else: ?>
                  <div class="track-cover-placeholder" aria-hidden="true"></div>
                <?php endif; ?>
              </div>
              <div class="track-meta">
                <div class="track-title"><span class="marquee"><?= htmlspecialchars($t['title']) ?></span></div>
                <?php if (!empty($t['artist'])): ?>
                  <div class="track-artist"><?= htmlspecialchars($t['artist']) ?></div>
                <?php endif; ?>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
      <?php endif; ?>

      <!-- timeline: keep existing block below (unchanged) -->
      <div class="timeline-simple">
        <div class="messages-header">
          <div class="messages-title">
            <i class="bi bi-calendar-event me-4 icon-spacing"></i>
            <strong>Timeline</strong>
          </div>
          <?php if (count($messages) > 3): ?>
            <button type="button" id="view-all-btn" class="view-all" data-expanded="0">
              View all <i class="bi bi-chevron-right view-all-icon" aria-hidden="true"></i>
            </button>
          <?php endif; ?>
        </div>

        <?php if (count($messages) === 0): ?>
          <div class="msg">No timeline yet</div>
        <?php else: ?>
          <?php $rev = array_values(array_reverse($messages)); ?>
          <?php foreach ($rev as $i => $m): ?>
            <?php $isExtra = ($i >= 3); ?>
            <div class="msg<?php if ($isExtra) echo ' extra-msg'; ?>" <?php if ($isExtra) echo 'style="display:none"'; ?>>
              <div class="msg-body">
                <div class="meta"><?= htmlspecialchars($m['name']) ?> • <?= date('M j, Y H:i', strtotime($m['time'])) ?></div>
                <div class="text"><?= nl2br(htmlspecialchars($m['message'])) ?></div>
              </div>
            </div>
          <?php endforeach; ?>
        <?php endif; ?>
      </div>
      
    </div> <!-- end .info -->
  </div> <!-- end .hero -->

  <!-- personal messages: use grid with avatar-initials and modal trigger -->
  <div class="hero single-row">
    <div class="info">
      <div class="personal-message-container" aria-label="Personal messages">

        <div class="messages-header">
          <div class="messages-title">
            <i class="bi bi-envelope-open-heart me-4 icon-spacing"></i>
            <strong>Birthday Messages</strong>
          </div>
        </div>

        <?php
// ensure messages are in grouped format; if not, normalize to a single unnamed group
if (!isset($personalMessages) || !is_array($personalMessages)) {
    $personalMessages = [];
} elseif (count($personalMessages) > 0) {
    // detect if array is numeric-indexed (legacy single-group format)
    $keys = array_keys($personalMessages);
    if ($keys !== array_filter($keys, 'is_string')) {
        // convert flat list into one default group
        $personalMessages = ['Messages' => $personalMessages];
    }
}
?>

<!-- Render grouped personal messages -->
<div class="personal-message-groups" aria-label="Personal message groups">
  <?php foreach ($personalMessages as $groupName => $groupMsgs): ?>
    <div class="pm-group" role="group" aria-label="<?= htmlspecialchars($groupName) ?>">
      <div class="messages-header" style="margin-bottom:.5rem;">
        <div class="messages-title">
          <strong><?= htmlspecialchars($groupName) ?></strong>
        </div>
      </div>

      <div class="personal-message-grid" role="list">
        <?php foreach ($groupMsgs as $idx => $pm):
            $name = isset($pm['from']) ? $pm['from'] : '';
            $msg = isset($pm['message']) ? $pm['message'] : '';
            $initial = $name !== '' ? mb_strtoupper(mb_substr($name, 0, 1)) : '?';

            // detect a photo path if provided; try raw path, assets/img/, _next/
            // resolve media: prefer explicit 'video' key, otherwise if 'photo' points to a video file treat it as video.
            $photoRel = '';
            $videoRel = '';
            $videoExts = ['mp4','webm','ogg','m4v'];

            // helper to probe candidate paths
            $probe = function($candBase) use ($videoExts) {
                $c = ltrim($candBase, '/');
                if (file_exists(__DIR__ . '/' . $c)) return $c;
                if (file_exists(__DIR__ . '/assets/video/' . $c)) return 'assets/video/' . $c;
                if (file_exists(__DIR__ . '/assets/img/' . $c)) return 'assets/img/' . $c;
                if (file_exists(__DIR__ . '/assets/media/' . $c)) return 'assets/media/' . $c;
                if (file_exists(__DIR__ . '/_next/' . $c)) return '_next/' . $c;
                return '';
            };

            // explicit video key
            if (!empty($pm['video'])) {
                $v = $probe($pm['video']);
                if ($v) $videoRel = $v;
            }

            // if photo key exists, probe it; decide image vs video by extension
            if (!empty($pm['photo'])) {
                $cand = ltrim($pm['photo'], '/');
                $ext = strtolower(pathinfo($cand, PATHINFO_EXTENSION));
                $found = $probe($cand);
                if ($found) {
                    if (in_array($ext, $videoExts, true)) {
                        // treat as video
                        if (!$videoRel) $videoRel = $found;
                    } else {
                        $photoRel = $found;
                    }
                }
            }
        ?>
          <div class="pm-item" role="button" tabindex="0"
               data-pm-id="<?= htmlspecialchars($groupName . '_' . $idx, ENT_QUOTES) ?>"
               data-name="<?= htmlspecialchars($name, ENT_QUOTES) ?>"
               data-message="<?= htmlspecialchars($msg, ENT_QUOTES) ?>"
               data-initial="<?= htmlspecialchars($initial, ENT_QUOTES) ?>"
               data-photo="<?= htmlspecialchars($photoRel, ENT_QUOTES) ?>"
               data-video="<?= htmlspecialchars($videoRel, ENT_QUOTES) ?>"
                aria-label="View message from <?= htmlspecialchars($name) ?>">
            <div class="pm-avatar" aria-hidden="true">
              <?php if ($photoRel): ?>
                <img src="<?= htmlspecialchars($photoRel) ?>" alt="Avatar of <?= htmlspecialchars($name) ?>">
              <?php else: ?>
                <?= htmlspecialchars($initial) ?>
              <?php endif; ?>
            </div>
            <div style="min-width:0;">
              <div class="pm-name"><?= htmlspecialchars($name) ?></div>
              <div class="pm-preview">
                <?= htmlspecialchars(preg_replace('/\s+/u', ' ', trim($msg))) ?>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  <?php endforeach; ?>
</div>

      </div>
    </div>
  </div>

  <!-- Modal for personal messages -->
  <div id="pm-modal" class="pm-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="pm-modal-title">
    <div class="pm-modal-backdrop" data-action="backdrop"></div>
    <div class="pm-modal-panel" role="document">
      <button class="pm-modal-close" aria-label="Close message">&times;</button>
      <div class="pm-modal-header">
        <div id="pm-modal-avatar" class="pm-modal-avatar" aria-hidden="true">A</div>
        <div>
          <h3 id="pm-modal-title" class="pm-modal-title">Name</h3>
          <div style="font-size:.9rem;color:#666">Birthday message</div>
        </div>
      </div>

      <div class="pm-modal-body">
        <div id="pm-modal-message" class="pm-message-content">
          <span class="pm-dropcap" id="pm-modal-dropcap">A</span>
          <div id="pm-modal-text"></div>
        </div>
        <!-- media container moved below the message so videos appear after the text -->
        <div id="pm-modal-media" class="pm-modal-media" aria-hidden="true"></div>
      </div>
    </div>
  </div>

</div> 

<?php
// include shared footer
require_once __DIR__ . '/controller/extension/footer.php';
?>

<!-- expose server values for JS and load external script -->
<script>
  window.BDAY_TARGET = <?= (int)$targetMs ?>;
  window.BDAY_MD = <?= json_encode($bd_md) ?>;
  window.HAS_SONG = <?= $hasSong ? 'true' : 'false' ?>;
  window.PLAYLIST = <?= json_encode(array_map(function($p){ return $p['file']; }, $playlist)) ?>;
</script>
<script src="insight/counttime.js" defer></script>
<script src="insight/darkmode.js" defer></script>
<script src="insight/playlist.js" defer></script>
<script src="insight/pm-modal.js" defer></script>
</body>
</html>