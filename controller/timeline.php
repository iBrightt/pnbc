<?php
date_default_timezone_set('Asia/Manila');

// include centralized classes
require_once __DIR__ . '/../assets/class/classes.php';

$messagesFile = __DIR__ . '/messages.json';
$store = new MessageStore($messagesFile);
$messages = $store->load();
$rev = array_values(array_reverse($messages));
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>All Timeline</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
<link rel="stylesheet" href="../assets/front/style.css">
<link rel="stylesheet" href="../assets/front/responsive.css">
</head>
<body>
<div class="wrap messages-page">
  <div class="page-header">
    <div class="page-header-left">
      <a href="../index.php" class="back-btn view-all" aria-label="Back to Home">
        <i class="bi bi-arrow-left view-all-icon" aria-hidden="true"></i>
        <span class="back-text">Back to Home</span>
      </a>
      <h2 class="page-title">Timeline</h2>
    </div>
  </div>

  <!-- added timeline-container class -->
  <div class="messages timeline-container">
    <?php if (count($rev) === 0): ?>
      <div class="msg">No timeline yet</div>
    <?php else: ?>
      <?php $first = true; ?>
      <?php foreach ($rev as $m): ?>
        <!-- add 'latest' class to the first (newest) message -->
        <div class="msg<?= $first ? ' latest' : '' ?>">
          <div class="msg-body">
            <div class="meta"><?= htmlspecialchars($m['name']) ?> • <?= date('M j, Y H:i', strtotime($m['time'])) ?></div>
            <div class="text"><?= nl2br(htmlspecialchars($m['message'])) ?></div>
          </div>
        </div>
      <?php $first = false; endforeach; ?>
    <?php endif; ?>
  </div>
</div>

<?php
// include shared footer (relative path from controller/)
require_once __DIR__ . '/../controller/extension/footer.php';
?>

<!-- include the same script so theme toggle / persisted theme is applied here too -->
<script src="../insight/darkmode.js" defer></script>
</body>
</html>
