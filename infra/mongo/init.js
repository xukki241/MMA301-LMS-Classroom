/* Tạo 2 database theo service. Collection/index đầy đủ do Mongoose sync khi service chạy. */
db = db.getSiblingDB("lms_auth");
db.createCollection("_bootstrap");

db = db.getSiblingDB("lms_core");
db.createCollection("_bootstrap");
