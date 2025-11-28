-- Check error reports from users
-- Run this periodically to see if users are having detection issues

-- Get all unprocessed error reports
SELECT 
    id,
    user_id,
    game_id,
    round_number,
    detected_score,
    corrected_score,
    created_at,
    processed
FROM error_reports
WHERE processed = false
ORDER BY created_at DESC;

-- Get summary of error reports by user
SELECT 
    user_id,
    COUNT(*) as total_reports,
    AVG(ABS(detected_score - corrected_score)) as avg_correction_amount,
    MAX(created_at) as last_report
FROM error_reports
GROUP BY user_id
ORDER BY total_reports DESC;

-- Get recent error reports (last 7 days)
SELECT 
    er.id,
    er.user_id,
    er.detected_score,
    er.corrected_score,
    er.created_at,
    er.notes
FROM error_reports er
WHERE er.created_at > NOW() - INTERVAL '7 days'
ORDER BY er.created_at DESC;

-- Mark reports as processed (run after reviewing)
-- UPDATE error_reports SET processed = true WHERE id IN (1, 2, 3);
