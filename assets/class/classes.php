<?php
class MessageStore {
    private $file;
    public function __construct(string $path) {
        $this->file = $path;
        if (!file_exists($this->file)) file_put_contents($this->file, json_encode([], JSON_PRETTY_PRINT));
    }
    public function load(): array {
        $data = @file_get_contents($this->file);
        $arr = json_decode($data, true);
        return is_array($arr) ? $arr : [];
    }
    public function add(string $name, string $message): void {
        $name = trim(strip_tags($name));
        $message = trim(strip_tags($message));
        if ($name === '') $name = 'Anonymous';
        if ($message === '') return;
        $messages = $this->load();
        $messages[] = ['name'=>$name, 'message'=>$message, 'time'=>date('c')];
        file_put_contents($this->file, json_encode($messages, JSON_PRETTY_PRINT), LOCK_EX);
    }
}
