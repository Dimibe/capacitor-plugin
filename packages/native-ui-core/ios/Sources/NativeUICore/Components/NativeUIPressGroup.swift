import UIKit

@available(iOS 26.0, *)
final class NativeUIPressGroup: UIVisualEffectView {
    private struct Member {
        let id: String
        let surface: UIVisualEffectView
        let button: UIButton
    }
    private var members: [Member] = []

    init(_ node: NativeUIControl, scale: CGFloat, rendering: NativeUIControlRendering, activate: @escaping (String) -> Void) {
        super.init(effect: UIGlassContainerEffect())
        accessibilityIdentifier = node.id
        update(node, scale: scale, rendering: rendering, activate: activate)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is unsupported") }

    func update(_ node: NativeUIControl, scale: CGFloat, rendering: NativeUIControlRendering, activate: @escaping (String) -> Void) {
        let ids = node.items.map(\.id)
        if members.map(\.id) != ids {
            var previous = Dictionary(uniqueKeysWithValues: members.map { ($0.id, $0) })
            members = ids.map { id in
                if let existing = previous.removeValue(forKey: id) { return existing }
                let surface = UIVisualEffectView()
                surface.cornerConfiguration = .capsule()
                contentView.addSubview(surface)
                let button = UIButton(type: .system)
                surface.contentView.addSubview(button)
                return Member(id: id, surface: surface, button: button)
            }
            for removed in previous.values { removed.surface.removeFromSuperview() }
            accessibilityElements = members.map(\.button)
        }
        for (item, member) in zip(node.items, members) {
            let tint = item.content.backgroundColor.map { rendering.color($0) }
            let interactive = !item.content.disabled
            let previous = member.surface.effect as? UIGlassEffect
            if previous?.tintColor != tint || previous?.isInteractive != interactive {
                let glass = UIGlassEffect(style: .regular)
                glass.isInteractive = interactive
                glass.tintColor = tint
                member.surface.effect = glass
            }
            member.surface.layer.borderWidth = (item.content.borderWidth ?? 0) * scale
            member.surface.layer.borderColor = item.content.borderColor.map { rendering.color($0).cgColor }
            member.surface.frame = item.frame.rect.applying(CGAffineTransform(scaleX: scale, y: scale))
            let button = NativeUIButton.render(item.content, glass: false, existing: member.button, rendering: rendering, activate: activate)
            button.semanticContentAttribute = node.rtl ? .forceRightToLeft : .forceLeftToRight
            button.frame = member.surface.bounds
        }
        var spacing = CGFloat.infinity
        for (index, member) in members.enumerated() {
            let frame = member.surface.frame
            for other in members.prefix(index) {
                let neighbor = other.surface.frame
                let dx = max(0, frame.minX - neighbor.maxX, neighbor.minX - frame.maxX)
                let dy = max(0, frame.minY - neighbor.maxY, neighbor.minY - frame.maxY)
                spacing = min(spacing, hypot(dx, dy))
            }
        }
        if spacing.isFinite, (effect as? UIGlassContainerEffect)?.spacing != spacing {
            let container = UIGlassContainerEffect()
            container.spacing = spacing
            effect = container
        }
    }

    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        members.contains { $0.surface.frame.contains(convert(point, to: contentView)) }
    }
}
