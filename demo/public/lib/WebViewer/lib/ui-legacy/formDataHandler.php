<?php
/**
 * formDataHandler.php
 * This PHP script is a sample for handling form widget submits from WebViewer.
 * The HTML form POST data submitted will be displayed in table format and written to the formDataCapture.html file.
 * 
 */
$table = "<table border='1'><tr><th>Key</th><th>Value</th>";
foreach ($_POST as $key => $value) {
    $row = "<tr><td>{$key}</td><td>{$value}</td></tr>";
    $table .= $row;
}

$table .= "</table>";
$heading = "<h1>Form Data Sample</h1><p>The file captures the form data submitted from within a WebViewer document with form widgets.</p>";
$output = "<html><head/><body>{$heading}{$table}</body></html>";
if (file_put_contents("formDataCaptured.html", $output)) {
    //output successfully written to file
}
echo $output;
?>
